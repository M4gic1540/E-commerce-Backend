import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { SupabaseService, PaginatedResult } from "@app/shared";

@Injectable()
export class ProductsService {
  constructor(private supabase: SupabaseService) {}

  async findAll(query: any): Promise<PaginatedResult<any>> {
    const client = this.supabase.getAdminClient();
    const page = query.page || 1;
    const limit = query.limit || 12;
    const offset = (page - 1) * limit;

    let qb = client
      .from("products")
      .select("*, categories(name)", { count: "exact" })
      .is("deleted_at", null);

    if (query.category_id) qb = qb.eq("category_id", query.category_id);
    if (query.search) qb = qb.ilike("name", `%${query.search}%`);
    if (query.min_price !== undefined) qb = qb.gte("price", query.min_price);
    if (query.max_price !== undefined) qb = qb.lte("price", query.max_price);
    if (query.min_rating !== undefined) qb = qb.gte("rating", query.min_rating);
    if (query.featured !== undefined) qb = qb.eq("featured", query.featured);

    switch (query.sort) {
      case "price_asc":
        qb = qb.order("price", { ascending: true });
        break;
      case "price_desc":
        qb = qb.order("price", { ascending: false });
        break;
      case "rating":
        qb = qb.order("rating", { ascending: false });
        break;
      case "newest":
        qb = qb.order("created_at", { ascending: false });
        break;
      case "name":
        qb = qb.order("name", { ascending: true });
        break;
      default:
        qb = qb.order("created_at", { ascending: false });
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
      .from("products")
      .select("*, categories(name)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new RpcException({
        statusCode: 404,
        message: `Producto con ID ${id} no encontrado`,
      });
    }
    return data;
  }

  async findFeatured() {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from("products")
      .select("*, categories(name)")
      .eq("featured", true)
      .is("deleted_at", null)
      .order("rating", { ascending: false })
      .limit(8);

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return data || [];
  }

  async create(dto: any) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from("products")
      .insert({
        name: dto.name,
        category_id: dto.category_id,
        price: dto.price,
        original_price: dto.original_price,
        description: dto.description,
        images: dto.images,
        stock: dto.stock ?? 0,
        variants: dto.variants,
        featured: dto.featured ?? false,
        rating: 0,
        review_count: 0,
      })
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
      .from("products")
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
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });
    return { message: `Producto ${id} eliminado exitosamente` };
  }

  async restore(id: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from("products")
      .update({ deleted_at: null })
      .eq("id", id)
      .not("deleted_at", "is", null)
      .select()
      .single();

    if (error || !data) {
      throw new RpcException({
        statusCode: 404,
        message: `Producto con ID ${id} no encontrado o no está eliminado`,
      });
    }
    return { message: `Producto ${id} restaurado exitosamente`, data };
  }
}
