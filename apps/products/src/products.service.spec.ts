import { Test, TestingModule } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { ProductsService } from "./products.service";
import { SupabaseService } from "@app/shared";

describe("ProductsService", () => {
  let service: ProductsService;

  // Helper para construir cadenas de query builder
  const createQueryBuilder = (finalResult: any) => {
    const qb: any = {};
    const methods = [
      "select",
      "eq",
      "is",
      "ilike",
      "gte",
      "lte",
      "not",
      "order",
      "range",
      "limit",
      "single",
      "insert",
      "update",
      "in",
    ];
    methods.forEach((m) => {
      qb[m] = jest.fn().mockReturnValue(qb);
    });
    // El último método de la cadena resuelve a finalResult
    qb.single = jest.fn().mockResolvedValue(finalResult);
    qb.range = jest.fn().mockImplementation(() => {
      // Para findAll que termina sin .single()
      return Promise.resolve(finalResult);
    });
    qb.limit = jest.fn().mockImplementation(() => Promise.resolve(finalResult));
    return qb;
  };

  const mockAdminClient: any = {
    from: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it("debe estar definido", () => {
    expect(service).toBeDefined();
  });

  // ─── FIND ALL ────────────────────────────────────────────
  describe("findAll", () => {
    it("debe retornar productos paginados", async () => {
      const mockProducts = [
        {
          id: "1",
          name: "Producto 1",
          price: 10,
          categories: { name: "Cat1" },
        },
        {
          id: "2",
          name: "Producto 2",
          price: 20,
          categories: { name: "Cat2" },
        },
      ];

      const qb: any = {};
      const chainMethods = [
        "select",
        "is",
        "eq",
        "ilike",
        "gte",
        "lte",
        "order",
        "range",
      ];
      chainMethods.forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      // range es el final, resuelve como promesa
      qb.range = jest
        .fn()
        .mockResolvedValue({ data: mockProducts, error: null, count: 2 });

      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 12 });

      expect(result).toEqual({
        data: mockProducts,
        total: 2,
        page: 1,
        limit: 12,
        totalPages: 1,
      });
      expect(mockAdminClient.from).toHaveBeenCalledWith("products");
    });

    it("debe aplicar filtros de búsqueda", async () => {
      const qb: any = {};
      const chainMethods = [
        "select",
        "is",
        "eq",
        "ilike",
        "gte",
        "lte",
        "order",
        "range",
      ];
      chainMethods.forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.range = jest
        .fn()
        .mockResolvedValue({ data: [], error: null, count: 0 });
      mockAdminClient.from.mockReturnValue(qb);

      await service.findAll({
        page: 1,
        limit: 12,
        category_id: "cat-1",
        search: "auricular",
        min_price: 10,
        max_price: 100,
        sort: "price_asc",
      });

      expect(qb.eq).toHaveBeenCalledWith("category_id", "cat-1");
      expect(qb.ilike).toHaveBeenCalledWith("name", "%auricular%");
      expect(qb.gte).toHaveBeenCalledWith("price", 10);
      expect(qb.lte).toHaveBeenCalledWith("price", 100);
    });

    it("debe lanzar RpcException si hay error en la consulta", async () => {
      const qb: any = {};
      const chainMethods = ["select", "is", "eq", "order", "range"];
      chainMethods.forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.range = jest
        .fn()
        .mockResolvedValue({
          data: null,
          error: { message: "DB error" },
          count: 0,
        });
      mockAdminClient.from.mockReturnValue(qb);

      await expect(service.findAll({})).rejects.toThrow(RpcException);
    });
  });

  // ─── FIND ONE ─────────────────────────────────────────────
  describe("findOne", () => {
    it("debe retornar un producto por ID", async () => {
      const mockProduct = { id: "p-1", name: "Producto", price: 50 };
      const qb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.single = jest
        .fn()
        .mockResolvedValue({ data: mockProduct, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findOne("p-1");
      expect(result).toEqual(mockProduct);
    });

    it("debe lanzar RpcException si el producto no existe", async () => {
      const qb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Not found" } });
      mockAdminClient.from.mockReturnValue(qb);

      await expect(service.findOne("bad-id")).rejects.toThrow(RpcException);
    });
  });

  // ─── FIND FEATURED ────────────────────────────────────────
  describe("findFeatured", () => {
    it("debe retornar productos destacados", async () => {
      const mockFeatured = [{ id: "1", name: "Featured", featured: true }];
      const qb: any = {};
      ["select", "eq", "is", "order"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.limit = jest
        .fn()
        .mockResolvedValue({ data: mockFeatured, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findFeatured();
      expect(result).toEqual(mockFeatured);
      expect(qb.eq).toHaveBeenCalledWith("featured", true);
    });

    it("debe retornar array vacío si no hay productos destacados", async () => {
      const qb: any = {};
      ["select", "eq", "is", "order"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.limit = jest.fn().mockResolvedValue({ data: null, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findFeatured();
      expect(result).toEqual([]);
    });
  });

  // ─── CREATE ───────────────────────────────────────────────
  describe("create", () => {
    it("debe crear un producto exitosamente", async () => {
      const dto = {
        name: "Nuevo Producto",
        category_id: "cat-1",
        price: 99.99,
        description: "Descripción",
        images: ["img.jpg"],
        stock: 10,
      };
      const created = { id: "new-1", ...dto, rating: 0, review_count: 0 };
      const qb: any = {};
      qb.insert = jest.fn().mockReturnValue(qb);
      qb.select = jest.fn().mockReturnValue(qb);
      qb.single = jest.fn().mockResolvedValue({ data: created, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.create(dto);
      expect(result).toEqual(created);
      expect(qb.insert).toHaveBeenCalled();
    });

    it("debe lanzar RpcException si la inserción falla", async () => {
      const qb: any = {};
      qb.insert = jest.fn().mockReturnValue(qb);
      qb.select = jest.fn().mockReturnValue(qb);
      qb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Insert failed" } });
      mockAdminClient.from.mockReturnValue(qb);

      await expect(service.create({ name: "Test" } as any)).rejects.toThrow(
        RpcException,
      );
    });
  });

  // ─── UPDATE ───────────────────────────────────────────────
  describe("update", () => {
    it("debe actualizar un producto exitosamente", async () => {
      const updated = { id: "p-1", name: "Actualizado", price: 120 };

      // Mock para findOne dentro de update
      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest
        .fn()
        .mockResolvedValue({ data: { id: "p-1" }, error: null });

      // Mock para update
      const updateQb: any = {};
      updateQb.update = jest.fn().mockReturnValue(updateQb);
      updateQb.eq = jest.fn().mockReturnValue(updateQb);
      updateQb.select = jest.fn().mockReturnValue(updateQb);
      updateQb.single = jest
        .fn()
        .mockResolvedValue({ data: updated, error: null });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? findQb : updateQb;
      });

      const result = await service.update("p-1", { name: "Actualizado" });
      expect(result).toEqual(updated);
    });
  });

  // ─── REMOVE ───────────────────────────────────────────────
  describe("remove", () => {
    it("debe eliminar un producto (soft delete)", async () => {
      // Mock para findOne
      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest
        .fn()
        .mockResolvedValue({ data: { id: "p-1" }, error: null });

      // Mock para update (soft delete)
      const deleteQb: any = {};
      deleteQb.update = jest.fn().mockReturnValue(deleteQb);
      deleteQb.eq = jest.fn().mockReturnValue(deleteQb);
      deleteQb.is = jest.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? findQb : deleteQb;
      });

      const result = await service.remove("p-1");
      expect(result.message).toContain("eliminado exitosamente");
    });
  });

  // ─── RESTORE ──────────────────────────────────────────────
  describe("restore", () => {
    it("debe restaurar un producto eliminado", async () => {
      const restored = { id: "p-1", name: "Restaurado", deleted_at: null };
      const qb: any = {};
      qb.update = jest.fn().mockReturnValue(qb);
      qb.eq = jest.fn().mockReturnValue(qb);
      qb.not = jest.fn().mockReturnValue(qb);
      qb.select = jest.fn().mockReturnValue(qb);
      qb.single = jest.fn().mockResolvedValue({ data: restored, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.restore("p-1");
      expect(result.message).toContain("restaurado exitosamente");
      expect(result.data).toEqual(restored);
    });

    it("debe lanzar RpcException si el producto no está eliminado", async () => {
      const qb: any = {};
      qb.update = jest.fn().mockReturnValue(qb);
      qb.eq = jest.fn().mockReturnValue(qb);
      qb.not = jest.fn().mockReturnValue(qb);
      qb.select = jest.fn().mockReturnValue(qb);
      qb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Not found" } });
      mockAdminClient.from.mockReturnValue(qb);

      await expect(service.restore("p-1")).rejects.toThrow(RpcException);
    });
  });
});
