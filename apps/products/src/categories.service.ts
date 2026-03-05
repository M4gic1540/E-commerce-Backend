import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { SupabaseService } from "@app/shared";

@Injectable()
export class CategoriesService {
  constructor(private supabase: SupabaseService) {}

  async findAll() {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from("categories")
      .select("*, products(count)")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });

    return (data || []).map((cat: any) => ({
      ...cat,
      product_count: cat.products?.[0]?.count || 0,
      products: undefined,
    }));
  }

  async findOne(id: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from("categories")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new RpcException({
        statusCode: 404,
        message: `Categoría con ID ${id} no encontrada`,
      });
    }
    return data;
  }

  async create(dto: any) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from("categories")
      .insert(dto)
      .select()
      .single();

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return data;
  }

  async update(id: string, dto: any) {
    const client = this.supabase.getAdminClient();
    await this.findOne(id);

    const { data, error } = await client
      .from("categories")
      .update(dto)
      .eq("id", id)
      .select()
      .single();

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return data;
  }

  async remove(id: string) {
    const client = this.supabase.getAdminClient();
    await this.findOne(id);

    const { error } = await client
      .from("categories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return { message: `Categoría ${id} eliminada exitosamente` };
  }

  async restore(id: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from("categories")
      .update({ deleted_at: null })
      .eq("id", id)
      .not("deleted_at", "is", null)
      .select()
      .single();

    if (error || !data) {
      throw new RpcException({
        statusCode: 404,
        message: `Categoría con ID ${id} no encontrada o no está eliminada`,
      });
    }
    return { message: `Categoría ${id} restaurada exitosamente`, data };
  }
}
