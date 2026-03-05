import { Test, TestingModule } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { CustomersService } from "./customers.service";
import { SupabaseService } from "@app/shared";

describe("CustomersService", () => {
  let service: CustomersService;

  const mockAdminClient: any = {
    from: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
          },
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it("debe estar definido", () => {
    expect(service).toBeDefined();
  });

  // ─── FIND ALL ────────────────────────────────────────────
  describe("findAll", () => {
    it("debe retornar clientes paginados", async () => {
      const mockCustomers = [
        { id: "c-1", name: "Juan", email: "juan@test.com" },
      ];

      const qb: any = {};
      ["select", "is", "order", "or", "range"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.range = jest
        .fn()
        .mockResolvedValue({ data: mockCustomers, error: null, count: 1 });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 12 });

      expect(result.data).toEqual(mockCustomers);
      expect(result.total).toBe(1);
    });

    it("debe filtrar por búsqueda", async () => {
      const qb: any = {};
      ["select", "is", "order", "or", "range"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.range = jest
        .fn()
        .mockResolvedValue({ data: [], error: null, count: 0 });
      mockAdminClient.from.mockReturnValue(qb);

      await service.findAll({ search: "juan" });
      expect(qb.or).toHaveBeenCalledWith(
        "name.ilike.%juan%,email.ilike.%juan%",
      );
    });

    it("debe lanzar RpcException si hay error", async () => {
      const qb: any = {};
      ["select", "is", "order", "range"].forEach((m) => {
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
    it("debe retornar un cliente por ID", async () => {
      const mockCustomer = { id: "c-1", name: "Juan", email: "juan@test.com" };
      const qb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.single = jest
        .fn()
        .mockResolvedValue({ data: mockCustomer, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findOne("c-1");
      expect(result).toEqual(mockCustomer);
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

  // ─── GET STATS ─────────────────────────────────────────────
  describe("getStats", () => {
    it("debe retornar estadísticas del cliente", async () => {
      // findOne mock
      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest
        .fn()
        .mockResolvedValue({ data: { id: "c-1" }, error: null });

      // orders query mock
      const ordersQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        ordersQb[m] = jest.fn().mockReturnValue(ordersQb);
      });
      ordersQb.is = jest.fn().mockResolvedValue({
        data: [
          { total: 100, status: "delivered" },
          { total: 200, status: "pending" },
          { total: 150, status: "delivered" },
        ],
        error: null,
      });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? findQb : ordersQb;
      });

      const result = await service.getStats("c-1");

      expect(result.total_orders).toBe(3);
      expect(result.total_spent).toBe(450);
      expect(result.delivered_orders).toBe(2);
    });

    it("debe retornar ceros si el cliente no tiene pedidos", async () => {
      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest
        .fn()
        .mockResolvedValue({ data: { id: "c-1" }, error: null });

      const ordersQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        ordersQb[m] = jest.fn().mockReturnValue(ordersQb);
      });
      ordersQb.is = jest.fn().mockResolvedValue({ data: [], error: null });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? findQb : ordersQb;
      });

      const result = await service.getStats("c-1");

      expect(result.total_orders).toBe(0);
      expect(result.total_spent).toBe(0);
      expect(result.delivered_orders).toBe(0);
    });
  });

  // ─── UPDATE ───────────────────────────────────────────────
  describe("update", () => {
    it("debe actualizar el perfil del cliente", async () => {
      const updated = { id: "c-1", name: "Juan Actualizado" };

      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest
        .fn()
        .mockResolvedValue({ data: { id: "c-1" }, error: null });

      const updateQb: any = {};
      updateQb.update = jest.fn().mockReturnValue(updateQb);
      updateQb.eq = jest.fn().mockReturnValue(updateQb);
      updateQb.is = jest.fn().mockReturnValue(updateQb);
      updateQb.select = jest.fn().mockReturnValue(updateQb);
      updateQb.single = jest
        .fn()
        .mockResolvedValue({ data: updated, error: null });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? findQb : updateQb;
      });

      const result = await service.update("c-1", { name: "Juan Actualizado" });
      expect(result).toEqual(updated);
    });

    it("debe lanzar RpcException si la actualización falla", async () => {
      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest
        .fn()
        .mockResolvedValue({ data: { id: "c-1" }, error: null });

      const updateQb: any = {};
      updateQb.update = jest.fn().mockReturnValue(updateQb);
      updateQb.eq = jest.fn().mockReturnValue(updateQb);
      updateQb.is = jest.fn().mockReturnValue(updateQb);
      updateQb.select = jest.fn().mockReturnValue(updateQb);
      updateQb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Error" } });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? findQb : updateQb;
      });

      await expect(service.update("c-1", { name: "Fail" })).rejects.toThrow(
        RpcException,
      );
    });
  });
});
