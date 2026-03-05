import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { SupabaseService, PaginatedResult } from "@app/shared";
import { ReceiptService } from "./receipt.service";

@Injectable()
export class OrdersService {
  constructor(
    private supabase: SupabaseService,
    private receiptService: ReceiptService,
  ) {}

  async findAll(query: any): Promise<PaginatedResult<any>> {
    const client = this.supabase.getAdminClient();
    const page = query.page || 1;
    const limit = query.limit || 12;
    const offset = (page - 1) * limit;

    let qb = client
      .from("orders")
      .select(
        "*, order_items(*, products(name, images)), customers(name, email)",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (query.status) qb = qb.eq("status", query.status);
    if (query.customer_id) qb = qb.eq("customer_id", query.customer_id);

    qb = qb.range(offset, offset + limit - 1);
    const { data, error, count } = await qb;
    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async findOne(id: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from("orders")
      .select(
        "*, order_items(*, products(name, images, price)), customers(name, email)",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new RpcException({
        statusCode: 404,
        message: `Pedido con ID ${id} no encontrado`,
      });
    }
    return data;
  }

  async findByCustomer(customerId: string, query: any) {
    return this.findAll({ ...query, customer_id: customerId });
  }

  async create(customerId: string, dto: any) {
    const client = this.supabase.getAdminClient();

    const productIds = dto.items.map((item: any) => item.product_id);
    const { data: products, error: prodError } = await client
      .from("products")
      .select("id, name, price, stock, images")
      .in("id", productIds)
      .is("deleted_at", null);

    if (prodError)
      throw new RpcException({ statusCode: 500, message: prodError.message });
    if (!products || products.length !== productIds.length) {
      throw new RpcException({
        statusCode: 400,
        message: "Uno o más productos no existen",
      });
    }

    for (const item of dto.items) {
      const product = products.find((p: any) => p.id === item.product_id);
      if (!product)
        throw new RpcException({
          statusCode: 400,
          message: `Producto ${item.product_id} no encontrado`,
        });
      if (product.stock < item.quantity) {
        throw new RpcException({
          statusCode: 400,
          message: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}`,
        });
      }
    }

    const total = dto.items.reduce((sum: number, item: any) => {
      const product = products.find((p: any) => p.id === item.product_id)!;
      return sum + product.price * item.quantity;
    }, 0);

    const orderNumber = `PED-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error: orderError } = await client
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        status: "pending",
        total,
        shipping_address: dto.shipping_address,
        shipping_method: dto.shipping_method || "standard",
        payment_method: dto.payment_method || "card",
      })
      .select()
      .single();

    if (orderError)
      throw new RpcException({ statusCode: 500, message: orderError.message });

    const orderItems = dto.items.map((item: any) => {
      const product = products.find((p: any) => p.id === item.product_id)!;
      return {
        order_id: order.id,
        product_id: item.product_id,
        product_name: product.name,
        quantity: item.quantity,
        price: product.price,
      };
    });

    const { error: itemsError } = await client
      .from("order_items")
      .insert(orderItems);
    if (itemsError)
      throw new RpcException({ statusCode: 500, message: itemsError.message });

    for (const item of dto.items) {
      const product = products.find((p: any) => p.id === item.product_id)!;
      await client
        .from("products")
        .update({ stock: product.stock - item.quantity })
        .eq("id", item.product_id);
    }

    await client
      .from("cart_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("customer_id", customerId)
      .is("deleted_at", null);

    // Generar boleta PDF y subirla al storage
    const fullOrder = {
      ...order,
      order_items: orderItems,
      customers: await this.getCustomerInfo(client, customerId),
    };
    const receiptUrl = await this.receiptService
      .generateAndUpload(fullOrder)
      .catch((err) => {
        // No bloqueamos la creación si falla la boleta
        console.error("Error generando boleta:", err?.message ?? err);
        return null;
      });

    return { ...order, items: orderItems, order_number: orderNumber, receipt_url: receiptUrl };
  }

  async updateStatus(id: string, dto: any) {
    const client = this.supabase.getAdminClient();
    await this.findOne(id);

    const { data, error } = await client
      .from("orders")
      .update({ status: dto.status })
      .eq("id", id)
      .select()
      .single();

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });

    // Regenerar boleta cuando el pedido es entregado
    if (dto.status === "delivered") {
      const fullOrder = await this.findOne(id);
      this.receiptService.generateAndUpload(fullOrder).catch((err) =>
        console.error("Error regenerando boleta:", err?.message ?? err),
      );
    }

    return data;
  }

  async generateReceipt(id: string): Promise<{ receipt_url: string }> {
    const order = await this.findOne(id);
    const receipt_url = await this.receiptService.generateAndUpload(order);
    return { receipt_url };
  }

  async getReceipt(id: string): Promise<{ receipt_url: string }> {
    // Intentar devolver la URL almacenada; si no existe, generar
    const client = this.supabase.getAdminClient();
    const { data } = await client
      .from("orders")
      .select("receipt_url")
      .eq("id", id)
      .single();

    if (data?.receipt_url) {
      // Refrescar con URL firmada de 1 hora
      const receipt_url = await this.receiptService
        .getFreshReceiptUrl(id)
        .catch(() => data.receipt_url as string);
      return { receipt_url };
    }

    // Boleta aún no generada → generarla ahora
    const order = await this.findOne(id);
    const receipt_url = await this.receiptService.generateAndUpload(order);
    return { receipt_url };
  }

  // ── helpers privados ──────────────────────────────────────────────────────
  private async getCustomerInfo(client: any, customerId: string) {
    const { data } = await client
      .from("customers")
      .select("name, email")
      .eq("id", customerId)
      .single();
    return data ?? null;
  }

  async cancel(id: string) {
    const client = this.supabase.getAdminClient();
    const order = await this.findOne(id);

    if (order.status === "delivered") {
      throw new RpcException({
        statusCode: 400,
        message: "No se puede cancelar un pedido ya entregado",
      });
    }
    if (order.status === "cancelled") {
      throw new RpcException({
        statusCode: 400,
        message: "El pedido ya está cancelado",
      });
    }

    for (const item of order.order_items) {
      await client
        .from("products")
        .update({
          stock: item.products?.stock + item.quantity || item.quantity,
        })
        .eq("id", item.product_id);
    }

    const { data, error } = await client
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return data;
  }
}
