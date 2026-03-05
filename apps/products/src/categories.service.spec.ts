import { Test, TestingModule } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { CategoriesService } from "./categories.service";
import { SupabaseService } from "@app/shared";

describe("CategoriesService", () => {
  let service: CategoriesService;

  const mockAdminClient: any = {
    from: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it("debe estar definido", () => {
    expect(service).toBeDefined();
  });

  // ─── FIND ALL ────────────────────────────────────────────
  describe("findAll", () => {
    it("debe retornar categorías con product_count", async () => {
      const mockCategories = [
        { id: "1", name: "Electrónica", products: [{ count: 5 }] },
        { id: "2", name: "Ropa", products: [{ count: 3 }] },
      ];

      const qb: any = {};
      ["select", "is", "order"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.order = jest
        .fn()
        .mockResolvedValue({ data: mockCategories, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].product_count).toBe(5);
      expect(result[1].product_count).toBe(3);
      expect(result[0].products).toBeUndefined();
    });

    it("debe retornar array vacío si no hay categorías", async () => {
      const qb: any = {};
      ["select", "is", "order"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.order = jest.fn().mockResolvedValue({ data: null, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findAll();
      expect(result).toEqual([]);
    });

    it("debe lanzar RpcException si hay error", async () => {
      const qb: any = {};
      ["select", "is", "order"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.order = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "DB error" } });
      mockAdminClient.from.mockReturnValue(qb);

      await expect(service.findAll()).rejects.toThrow(RpcException);
    });
  });

  // ─── FIND ONE ─────────────────────────────────────────────
  describe("findOne", () => {
    it("debe retornar una categoría por ID", async () => {
      const mockCategory = { id: "cat-1", name: "Electrónica" };
      const qb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.single = jest
        .fn()
        .mockResolvedValue({ data: mockCategory, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findOne("cat-1");
      expect(result).toEqual(mockCategory);
    });

    it("debe lanzar RpcException si no existe", async () => {
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

  // ─── CREATE ───────────────────────────────────────────────
  describe("create", () => {
    it("debe crear una categoría", async () => {
      const dto = { name: "Nueva Categoría", image: "img.jpg" };
      const created = { id: "new-1", ...dto };
      const qb: any = {};
      qb.insert = jest.fn().mockReturnValue(qb);
      qb.select = jest.fn().mockReturnValue(qb);
      qb.single = jest.fn().mockResolvedValue({ data: created, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.create(dto);
      expect(result).toEqual(created);
    });

    it("debe lanzar RpcException si la creación falla", async () => {
      const qb: any = {};
      qb.insert = jest.fn().mockReturnValue(qb);
      qb.select = jest.fn().mockReturnValue(qb);
      qb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Insert error" } });
      mockAdminClient.from.mockReturnValue(qb);

      await expect(service.create({ name: "Fail" })).rejects.toThrow(
        RpcException,
      );
    });
  });

  // ─── UPDATE ───────────────────────────────────────────────
  describe("update", () => {
    it("debe actualizar una categoría", async () => {
      const updated = { id: "cat-1", name: "Actualizada" };

      // findOne mock
      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest
        .fn()
        .mockResolvedValue({ data: { id: "cat-1" }, error: null });

      // update mock
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

      const result = await service.update("cat-1", { name: "Actualizada" });
      expect(result).toEqual(updated);
    });
  });

  // ─── REMOVE ───────────────────────────────────────────────
  describe("remove", () => {
    it("debe eliminar una categoría (soft delete)", async () => {
      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest
        .fn()
        .mockResolvedValue({ data: { id: "cat-1" }, error: null });

      const deleteQb: any = {};
      deleteQb.update = jest.fn().mockReturnValue(deleteQb);
      deleteQb.eq = jest.fn().mockReturnValue(deleteQb);
      deleteQb.is = jest.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? findQb : deleteQb;
      });

      const result = await service.remove("cat-1");
      expect(result.message).toContain("eliminada exitosamente");
    });
  });

  // ─── RESTORE ──────────────────────────────────────────────
  describe("restore", () => {
    it("debe restaurar una categoría", async () => {
      const restored = { id: "cat-1", name: "Restaurada", deleted_at: null };
      const qb: any = {};
      qb.update = jest.fn().mockReturnValue(qb);
      qb.eq = jest.fn().mockReturnValue(qb);
      qb.not = jest.fn().mockReturnValue(qb);
      qb.select = jest.fn().mockReturnValue(qb);
      qb.single = jest.fn().mockResolvedValue({ data: restored, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.restore("cat-1");
      expect(result.message).toContain("restaurada exitosamente");
      expect(result.data).toEqual(restored);
    });

    it("debe lanzar RpcException si no está eliminada", async () => {
      const qb: any = {};
      qb.update = jest.fn().mockReturnValue(qb);
      qb.eq = jest.fn().mockReturnValue(qb);
      qb.not = jest.fn().mockReturnValue(qb);
      qb.select = jest.fn().mockReturnValue(qb);
      qb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Not found" } });
      mockAdminClient.from.mockReturnValue(qb);

      await expect(service.restore("cat-1")).rejects.toThrow(RpcException);
    });
  });
});
