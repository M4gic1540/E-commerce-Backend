import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { SupabaseService } from "@app/shared";

@Injectable()
export class CartService {
  constructor(private supabase: SupabaseService) {}

  async getCart(customerId: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from("cart_items")
      .select("*, products(id, name, price, original_price, images, stock)")
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });

    const items = (data || []).map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      product: item.products,
    }));

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    return {
      items,
      total_items: totalItems,
      total_price: Math.round(totalPrice * 100) / 100,
    };
  }

  async addItem(customerId: string, dto: any) {
    const client = this.supabase.getAdminClient();

    const { data: product, error: prodError } = await client
      .from("products")
      .select("id, stock, name")
      .eq("id", dto.product_id)
      .is("deleted_at", null)
      .single();

    if (prodError || !product) {
      throw new RpcException({
        statusCode: 404,
        message: "Producto no encontrado",
      });
    }
    if (product.stock < dto.quantity) {
      throw new RpcException({
        statusCode: 400,
        message: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}`,
      });
    }

    const { data: existing } = await client
      .from("cart_items")
      .select("id, quantity")
      .eq("customer_id", customerId)
      .eq("product_id", dto.product_id)
      .is("deleted_at", null)
      .single();

    if (existing) {
      const newQty = existing.quantity + dto.quantity;
      if (newQty > product.stock) {
        throw new RpcException({
          statusCode: 400,
          message: "No hay suficiente stock",
        });
      }
      const { data, error } = await client
        .from("cart_items")
        .update({ quantity: newQty })
        .eq("id", existing.id)
        .select()
        .single();
      if (error)
        throw new RpcException({ statusCode: 500, message: error.message });
      return data;
    }

    const { data: softDeleted } = await client
      .from("cart_items")
      .select("id")
      .eq("customer_id", customerId)
      .eq("product_id", dto.product_id)
      .not("deleted_at", "is", null)
      .single();

    if (softDeleted) {
      const { data, error } = await client
        .from("cart_items")
        .update({ quantity: dto.quantity, deleted_at: null })
        .eq("id", softDeleted.id)
        .select()
        .single();
      if (error)
        throw new RpcException({ statusCode: 500, message: error.message });
      return data;
    }

    const { data, error } = await client
      .from("cart_items")
      .insert({
        customer_id: customerId,
        product_id: dto.product_id,
        quantity: dto.quantity,
      })
      .select()
      .single();

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return data;
  }

  async updateQuantity(customerId: string, itemId: string, quantity: number) {
    const client = this.supabase.getAdminClient();

    if (quantity < 1) return this.removeItem(customerId, itemId);

    const { data: item, error: findError } = await client
      .from("cart_items")
      .select("*, products(stock)")
      .eq("id", itemId)
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .single();

    if (findError || !item) {
      throw new RpcException({
        statusCode: 404,
        message: "Item del carrito no encontrado",
      });
    }
    if (quantity > item.products.stock) {
      throw new RpcException({
        statusCode: 400,
        message: "Stock insuficiente",
      });
    }

    const { data, error } = await client
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId)
      .select()
      .single();

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return data;
  }

  async removeItem(customerId: string, itemId: string) {
    const client = this.supabase.getAdminClient();
    const { error } = await client
      .from("cart_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("customer_id", customerId)
      .is("deleted_at", null);

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return { message: "Item eliminado del carrito" };
  }

  async clearCart(customerId: string) {
    const client = this.supabase.getAdminClient();
    const { error } = await client
      .from("cart_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("customer_id", customerId)
      .is("deleted_at", null);

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return { message: "Carrito vacío" };
  }
}
