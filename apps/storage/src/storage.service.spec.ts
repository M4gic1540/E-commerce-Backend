import { Test, TestingModule } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { StorageService } from "./storage.service";
import { SupabaseService } from "@app/shared";

describe("StorageService", () => {
  let service: StorageService;

  const mockStorage = {
    listBuckets: jest.fn(),
    createBucket: jest.fn(),
    from: jest.fn(),
  };

  const mockAdminClient: any = {
    storage: mockStorage,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it("debe estar definido", () => {
    expect(service).toBeDefined();
  });

  // ─── ENSURE BUCKET ────────────────────────────────────────
  describe("ensureBucket", () => {
    it("no debe crear el bucket si ya existe", async () => {
      mockStorage.listBuckets.mockResolvedValue({
        data: [{ name: "products" }, { name: "other" }],
      });

      await service.ensureBucket();

      expect(mockStorage.listBuckets).toHaveBeenCalled();
      expect(mockStorage.createBucket).not.toHaveBeenCalled();
    });

    it("debe crear el bucket si no existe", async () => {
      mockStorage.listBuckets.mockResolvedValue({
        data: [{ name: "other" }],
      });
      mockStorage.createBucket.mockResolvedValue({ error: null });

      await service.ensureBucket();

      expect(mockStorage.createBucket).toHaveBeenCalledWith("products", {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ],
      });
    });
  });

  // ─── UPLOAD IMAGE ─────────────────────────────────────────
  describe("uploadImage", () => {
    it("debe subir una imagen exitosamente", async () => {
      mockStorage.listBuckets.mockResolvedValue({
        data: [{ name: "products" }],
      });

      const mockBucketApi = {
        upload: jest.fn().mockResolvedValue({
          data: { path: "images/123.jpg" },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: {
            publicUrl: "https://supabase.co/storage/products/images/123.jpg",
          },
        }),
      };
      mockStorage.from.mockReturnValue(mockBucketApi);

      const file = {
        buffer: Buffer.from("fake-image-data"),
        originalname: "test.jpg",
        mimetype: "image/jpeg",
      };

      const result = await service.uploadImage(file, "images");

      expect(result.path).toBe("images/123.jpg");
      expect(result.url).toBe(
        "https://supabase.co/storage/products/images/123.jpg",
      );
      expect(mockBucketApi.upload).toHaveBeenCalled();
    });

    it("debe lanzar RpcException si la subida falla", async () => {
      mockStorage.listBuckets.mockResolvedValue({
        data: [{ name: "products" }],
      });

      const mockBucketApi = {
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Upload error" },
        }),
      };
      mockStorage.from.mockReturnValue(mockBucketApi);

      const file = {
        buffer: Buffer.from("fake"),
        originalname: "test.jpg",
        mimetype: "image/jpeg",
      };

      await expect(service.uploadImage(file)).rejects.toThrow(RpcException);
    });
  });

  // ─── DELETE IMAGE ─────────────────────────────────────────
  describe("deleteImage", () => {
    it("debe eliminar una imagen exitosamente", async () => {
      const mockBucketApi = {
        remove: jest.fn().mockResolvedValue({ error: null }),
      };
      mockStorage.from.mockReturnValue(mockBucketApi);

      const result = await service.deleteImage("images/123.jpg");

      expect(result.message).toContain("eliminada exitosamente");
      expect(mockBucketApi.remove).toHaveBeenCalledWith(["images/123.jpg"]);
    });

    it("debe lanzar RpcException si la eliminación falla", async () => {
      const mockBucketApi = {
        remove: jest
          .fn()
          .mockResolvedValue({ error: { message: "Delete error" } }),
      };
      mockStorage.from.mockReturnValue(mockBucketApi);

      await expect(service.deleteImage("images/123.jpg")).rejects.toThrow(
        RpcException,
      );
    });
  });

  // ─── LIST IMAGES ──────────────────────────────────────────
  describe("listImages", () => {
    it("debe listar imágenes de una carpeta", async () => {
      const mockFiles = [
        { name: "img1.jpg", created_at: "2024-01-01" },
        { name: "img2.png", created_at: "2024-01-02" },
      ];

      const mockBucketApi = {
        list: jest.fn().mockResolvedValue({ data: mockFiles, error: null }),
        getPublicUrl: jest.fn().mockImplementation((path: string) => ({
          data: { publicUrl: `https://supabase.co/storage/products/${path}` },
        })),
      };
      mockStorage.from.mockReturnValue(mockBucketApi);

      const result = await service.listImages("images");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("img1.jpg");
      expect(result[0].path).toBe("images/img1.jpg");
      expect(result[0].url).toContain("img1.jpg");
    });

    it("debe retornar array vacío si no hay imágenes", async () => {
      const mockBucketApi = {
        list: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn(),
      };
      mockStorage.from.mockReturnValue(mockBucketApi);

      const result = await service.listImages("images");
      expect(result).toEqual([]);
    });

    it("debe lanzar RpcException si hay error al listar", async () => {
      const mockBucketApi = {
        list: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: "List error" } }),
      };
      mockStorage.from.mockReturnValue(mockBucketApi);

      await expect(service.listImages("images")).rejects.toThrow(RpcException);
    });
  });
});
