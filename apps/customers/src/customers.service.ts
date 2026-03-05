import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { SupabaseService, PaginatedResult } from "@app/shared";

@Injectable()
export class CustomersService {
  constructor(private supabase: SupabaseService) {}

  async findAll(query: any): Promise<PaginatedResult<any>> {
    const client = this.supabase.getAdminClient();
    const page = query.page || 1;
    const limit = query.limit || 12;
    const offset = (page - 1) * limit;

    let qb = client
      .from("customers")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (query.search) {
      qb = qb.or(`name.ilike.%${query.search}%,email.ilike.%${query.search}%`);
    }

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
      .from("customers")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new RpcException({
        statusCode: 404,
        message: `Cliente con ID ${id} no encontrado`,
      });
    }
    return data;
  }

  async getStats(id: string) {
    const client = this.supabase.getAdminClient();
    await this.findOne(id);

    const { data: orders, error } = await client
      .from("orders")
      .select("total, status")
      .eq("customer_id", id)
      .is("deleted_at", null);

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });

    const totalOrders = orders?.length || 0;
    const totalSpent = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const deliveredOrders =
      orders?.filter((o) => o.status === "delivered").length || 0;

    return {
      total_orders: totalOrders,
      total_spent: totalSpent,
      delivered_orders: deliveredOrders,
    };
  }

  async update(id: string, data: any) {
    const client = this.supabase.getAdminClient();
    await this.findOne(id);

    const { data: updated, error } = await client
      .from("customers")
      .update(data)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return updated;
  }
}
