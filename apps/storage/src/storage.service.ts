import { Injectable, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { SupabaseService } from "@app/shared";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly BUCKET = "products";

  constructor(private supabase: SupabaseService) {}

  async ensureBucket() {
    const client = this.supabase.getAdminClient();
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === this.BUCKET);
    if (!exists) {
      const { error } = await client.storage.createBucket(this.BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ],
      });
      if (error) this.logger.error(`Error creando bucket: ${error.message}`);
      else this.logger.log(`Bucket "${this.BUCKET}" creado`);
    }
  }

  async uploadImage(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    folder: string = "images",
  ) {
    const client = this.supabase.getAdminClient();
    await this.ensureBucket();

    const ext = file.originalname.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { data, error } = await client.storage
      .from(this.BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error)
      throw new RpcException({
        statusCode: 400,
        message: `Error al subir imagen: ${error.message}`,
      });

    const { data: publicUrl } = client.storage
      .from(this.BUCKET)
      .getPublicUrl(data.path);
    return { path: data.path, url: publicUrl.publicUrl };
  }

  async deleteImage(path: string) {
    const client = this.supabase.getAdminClient();
    const { error } = await client.storage.from(this.BUCKET).remove([path]);
    if (error)
      throw new RpcException({
        statusCode: 400,
        message: `Error al eliminar imagen: ${error.message}`,
      });
    return { message: "Imagen eliminada exitosamente" };
  }

  async listImages(folder: string = "images") {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client.storage
      .from(this.BUCKET)
      .list(folder, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error)
      throw new RpcException({ statusCode: 500, message: error.message });

    return (data || []).map((file) => {
      const { data: publicUrl } = client.storage
        .from(this.BUCKET)
        .getPublicUrl(`${folder}/${file.name}`);
      return {
        name: file.name,
        path: `${folder}/${file.name}`,
        url: publicUrl.publicUrl,
        created_at: file.created_at,
      };
    });
  }
}
