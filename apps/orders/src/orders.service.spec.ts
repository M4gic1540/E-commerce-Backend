import { Test, TestingModule } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { OrdersService } from "./orders.service";
import { SupabaseService } from "@app/shared";

describe("OrdersService", () => {
  let service: OrdersService;

  const mockAdminClient: any = {
    from: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it("debe estar definido", () => {
    expect(service).toBeDefined();
  });

  // ─── FIND ALL ────────────────────────────────────────────
  describe("findAll", () => {
    it("debe retornar pedidos paginados", async () => {
      const mockOrders = [
        { id: "o-1", order_number: "PED-1", status: "pending", total: 100 },
      ];

      const qb: any = {};
      ["select", "is", "order", "eq", "range"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.range = jest
        .fn()
        .mockResolvedValue({ data: mockOrders, error: null, count: 1 });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 12 });

      expect(result.data).toEqual(mockOrders);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it("debe filtrar por estado", async () => {
      const qb: any = {};
      ["select", "is", "order", "eq", "range"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.range = jest
        .fn()
        .mockResolvedValue({ data: [], error: null, count: 0 });
      mockAdminClient.from.mockReturnValue(qb);

      await service.findAll({ status: "pending" });
      expect(qb.eq).toHaveBeenCalledWith("status", "pending");
    });

    it("debe lanzar RpcException si hay error", async () => {
      const qb: any = {};
      ["select", "is", "order", "eq", "range"].forEach((m) => {
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
    it("debe retornar un pedido por ID", async () => {
      const mockOrder = { id: "o-1", order_number: "PED-1", total: 200 };
      const qb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.single = jest.fn().mockResolvedValue({ data: mockOrder, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findOne("o-1");
      expect(result).toEqual(mockOrder);
    });

    it("debe lanzar RpcException si el pedido no existe", async () => {
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

  // ─── FIND BY CUSTOMER ─────────────────────────────────────
  describe("findByCustomer", () => {
    it("debe retornar pedidos de un cliente", async () => {
      const qb: any = {};
      ["select", "is", "order", "eq", "range"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.range = jest
        .fn()
        .mockResolvedValue({ data: [], error: null, count: 0 });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.findByCustomer("cust-1", {
        page: 1,
        limit: 10,
      });
      expect(qb.eq).toHaveBeenCalledWith("customer_id", "cust-1");
      expect(result.data).toEqual([]);
    });
  });

  // ─── CREATE ───────────────────────────────────────────────
  describe("create", () => {
    const createDto = {
      items: [{ product_id: "prod-1", quantity: 2 }],
      shipping_address: {
        first_name: "Juan",
        last_name: "García",
        address: "Calle 1",
        city: "CDMX",
        state: "CDMX",
        zip_code: "06600",
        country: "México",
      },
    };

    it("debe crear un pedido exitosamente", async () => {
      const mockProducts = [
        { id: "prod-1", name: "Producto", price: 50, stock: 10, images: [] },
      ];
      const mockOrder = {
        id: "o-1",
        order_number: "PED-123",
        total: 100,
        status: "pending",
      };

      let fromCallCount = 0;

      // products select
      const productsQb: any = {};
      ["select", "in", "is"].forEach((m) => {
        productsQb[m] = jest.fn().mockReturnValue(productsQb);
      });
      productsQb.is = jest
        .fn()
        .mockResolvedValue({ data: mockProducts, error: null });

      // orders insert
      const orderInsertQb: any = {};
      orderInsertQb.insert = jest.fn().mockReturnValue(orderInsertQb);
      orderInsertQb.select = jest.fn().mockReturnValue(orderInsertQb);
      orderInsertQb.single = jest
        .fn()
        .mockResolvedValue({ data: mockOrder, error: null });

      // order_items insert
      const itemsInsertQb: any = {};
      itemsInsertQb.insert = jest.fn().mockResolvedValue({ error: null });

      // products update (stock)
      const prodUpdateQb: any = {};
      prodUpdateQb.update = jest.fn().mockReturnValue(prodUpdateQb);
      prodUpdateQb.eq = jest.fn().mockResolvedValue({ error: null });

      // cart_items update (clear cart)
      const cartClearQb: any = {};
      cartClearQb.update = jest.fn().mockReturnValue(cartClearQb);
      cartClearQb.eq = jest.fn().mockReturnValue(cartClearQb);
      cartClearQb.is = jest.fn().mockResolvedValue({ error: null });

      mockAdminClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        if (table === "products" && fromCallCount === 1) return productsQb;
        if (table === "orders") return orderInsertQb;
        if (table === "order_items") return itemsInsertQb;
        if (table === "products") return prodUpdateQb;
        if (table === "cart_items") return cartClearQb;
        return productsQb;
      });

      const result = await service.create("cust-1", createDto);

      expect(result).toHaveProperty("order_number");
      expect(result.items).toBeDefined();
    });

    it("debe lanzar RpcException si un producto no existe", async () => {
      const productsQb: any = {};
      ["select", "in", "is"].forEach((m) => {
        productsQb[m] = jest.fn().mockReturnValue(productsQb);
      });
      productsQb.is = jest.fn().mockResolvedValue({ data: [], error: null });
      mockAdminClient.from.mockReturnValue(productsQb);

      await expect(service.create("cust-1", createDto)).rejects.toThrow(
        RpcException,
      );
    });

    it("debe lanzar RpcException si no hay stock suficiente", async () => {
      const mockProducts = [
        { id: "prod-1", name: "Producto", price: 50, stock: 1, images: [] },
      ];
      const productsQb: any = {};
      ["select", "in", "is"].forEach((m) => {
        productsQb[m] = jest.fn().mockReturnValue(productsQb);
      });
      productsQb.is = jest
        .fn()
        .mockResolvedValue({ data: mockProducts, error: null });
      mockAdminClient.from.mockReturnValue(productsQb);

      const dtoInsufficient = {
        ...createDto,
        items: [{ product_id: "prod-1", quantity: 5 }],
      };

      await expect(service.create("cust-1", dtoInsufficient)).rejects.toThrow(
        RpcException,
      );
    });
  });

  // ─── UPDATE STATUS ─────────────────────────────────────────
  describe("updateStatus", () => {
    it("debe actualizar el estado de un pedido", async () => {
      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest
        .fn()
        .mockResolvedValue({ data: { id: "o-1" }, error: null });

      const updateQb: any = {};
      updateQb.update = jest.fn().mockReturnValue(updateQb);
      updateQb.eq = jest.fn().mockReturnValue(updateQb);
      updateQb.select = jest.fn().mockReturnValue(updateQb);
      updateQb.single = jest.fn().mockResolvedValue({
        data: { id: "o-1", status: "processing" },
        error: null,
      });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? findQb : updateQb;
      });

      const result = await service.updateStatus("o-1", {
        status: "processing",
      });
      expect(result.status).toBe("processing");
    });
  });

  // ─── CANCEL ────────────────────────────────────────────────
  describe("cancel", () => {
    it("debe cancelar un pedido y restaurar stock", async () => {
      const orderData = {
        id: "o-1",
        status: "pending",
        order_items: [
          { product_id: "prod-1", quantity: 2, products: { stock: 8 } },
        ],
      };

      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest
        .fn()
        .mockResolvedValue({ data: orderData, error: null });

      const prodUpdateQb: any = {};
      prodUpdateQb.update = jest.fn().mockReturnValue(prodUpdateQb);
      prodUpdateQb.eq = jest.fn().mockResolvedValue({ error: null });

      const cancelQb: any = {};
      cancelQb.update = jest.fn().mockReturnValue(cancelQb);
      cancelQb.eq = jest.fn().mockReturnValue(cancelQb);
      cancelQb.select = jest.fn().mockReturnValue(cancelQb);
      cancelQb.single = jest.fn().mockResolvedValue({
        data: { id: "o-1", status: "cancelled" },
        error: null,
      });

      let callCount = 0;
      mockAdminClient.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) return findQb; // findOne
        if (table === "products") return prodUpdateQb; // restore stock
        return cancelQb; // cancel
      });

      const result = await service.cancel("o-1");
      expect(result.status).toBe("cancelled");
    });

    it("debe lanzar RpcException si el pedido ya está entregado", async () => {
      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest.fn().mockResolvedValue({
        data: { id: "o-1", status: "delivered", order_items: [] },
        error: null,
      });
      mockAdminClient.from.mockReturnValue(findQb);

      await expect(service.cancel("o-1")).rejects.toThrow(RpcException);
    });

    it("debe lanzar RpcException si el pedido ya está cancelado", async () => {
      const findQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        findQb[m] = jest.fn().mockReturnValue(findQb);
      });
      findQb.single = jest.fn().mockResolvedValue({
        data: { id: "o-1", status: "cancelled", order_items: [] },
        error: null,
      });
      mockAdminClient.from.mockReturnValue(findQb);

      await expect(service.cancel("o-1")).rejects.toThrow(RpcException);
    });
  });
});
