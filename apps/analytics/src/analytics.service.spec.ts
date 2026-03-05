import { Test, TestingModule } from "@nestjs/testing";
import { AnalyticsService } from "./analytics.service";
import { SupabaseService } from "@app/shared";

describe("AnalyticsService", () => {
  let service: AnalyticsService;

  const mockAdminClient: any = {
    from: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it("debe estar definido", () => {
    expect(service).toBeDefined();
  });

  describe("getDashboard", () => {
    it("debe retornar datos del dashboard completo", async () => {
      const now = new Date();
      const currentMonthOrder = {
        total: 200,
        status: "delivered",
        created_at: now.toISOString(),
      };
      const previousMonth = new Date(now);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const previousMonthOrder = {
        total: 100,
        status: "pending",
        created_at: previousMonth.toISOString(),
      };

      // orders query
      const ordersQb: any = {};
      ["select", "is"].forEach((m) => {
        ordersQb[m] = jest.fn().mockReturnValue(ordersQb);
      });
      ordersQb.is = jest.fn().mockResolvedValue({
        data: [currentMonthOrder, previousMonthOrder],
        error: null,
      });

      // customers count
      const customersQb: any = {};
      ["select", "is"].forEach((m) => {
        customersQb[m] = jest.fn().mockReturnValue(customersQb);
      });
      customersQb.is = jest.fn().mockResolvedValue({ count: 10, error: null });

      // products count
      const productsQb: any = {};
      ["select", "is"].forEach((m) => {
        productsQb[m] = jest.fn().mockReturnValue(productsQb);
      });
      productsQb.is = jest.fn().mockResolvedValue({ count: 25, error: null });

      // low stock products
      const lowStockQb: any = {};
      ["select", "lt", "is", "order"].forEach((m) => {
        lowStockQb[m] = jest.fn().mockReturnValue(lowStockQb);
      });
      lowStockQb.order = jest.fn().mockResolvedValue({
        data: [{ id: "p-1", name: "Low Stock", stock: 3 }],
        error: null,
      });

      // top products (order_items)
      const topProductsQb: any = {};
      ["select", "is"].forEach((m) => {
        topProductsQb[m] = jest.fn().mockReturnValue(topProductsQb);
      });
      topProductsQb.is = jest.fn().mockResolvedValue({
        data: [
          {
            product_id: "p-1",
            product_name: "Producto A",
            quantity: 5,
            price: 50,
          },
          {
            product_id: "p-2",
            product_name: "Producto B",
            quantity: 3,
            price: 80,
          },
        ],
        error: null,
      });

      let callCount = 0;
      mockAdminClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === "orders") return ordersQb;
        if (table === "customers") return customersQb;
        if (table === "products" && callCount <= 3) return productsQb;
        if (table === "products") return lowStockQb;
        if (table === "order_items") return topProductsQb;
        return ordersQb;
      });

      const result = await service.getDashboard();

      // Estructura principal
      expect(result).toHaveProperty("revenue");
      expect(result).toHaveProperty("orders");
      expect(result).toHaveProperty("customers");
      expect(result).toHaveProperty("products");
      expect(result).toHaveProperty("sales_by_month");
      expect(result).toHaveProperty("top_products");

      // Revenue
      expect(result.revenue).toHaveProperty("current");
      expect(result.revenue).toHaveProperty("previous");
      expect(result.revenue).toHaveProperty("change");

      // Orders by status
      expect(result.orders.by_status).toHaveProperty("pending");
      expect(result.orders.by_status).toHaveProperty("processing");
      expect(result.orders.by_status).toHaveProperty("shipped");
      expect(result.orders.by_status).toHaveProperty("delivered");
      expect(result.orders.by_status).toHaveProperty("cancelled");

      // Customers
      expect(result.customers.total).toBe(10);

      // Products
      expect(result.products.total).toBe(25);

      // Sales by month
      expect(result.sales_by_month).toHaveLength(6);

      // Top products
      expect(result.top_products.length).toBeLessThanOrEqual(5);
    });

    it("debe manejar datos vacíos correctamente", async () => {
      const ordersQb: any = {};
      ["select", "is"].forEach((m) => {
        ordersQb[m] = jest.fn().mockReturnValue(ordersQb);
      });
      ordersQb.is = jest.fn().mockResolvedValue({ data: null, error: null });

      const customersQb: any = {};
      ["select", "is"].forEach((m) => {
        customersQb[m] = jest.fn().mockReturnValue(customersQb);
      });
      customersQb.is = jest.fn().mockResolvedValue({ count: 0, error: null });

      const productsQb: any = {};
      ["select", "is"].forEach((m) => {
        productsQb[m] = jest.fn().mockReturnValue(productsQb);
      });
      productsQb.is = jest.fn().mockResolvedValue({ count: 0, error: null });

      const lowStockQb: any = {};
      ["select", "lt", "is", "order"].forEach((m) => {
        lowStockQb[m] = jest.fn().mockReturnValue(lowStockQb);
      });
      lowStockQb.order = jest.fn().mockResolvedValue({ data: [], error: null });

      const topProductsQb: any = {};
      ["select", "is"].forEach((m) => {
        topProductsQb[m] = jest.fn().mockReturnValue(topProductsQb);
      });
      topProductsQb.is = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      let callCount = 0;
      mockAdminClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === "orders") return ordersQb;
        if (table === "customers") return customersQb;
        if (table === "products" && callCount <= 3) return productsQb;
        if (table === "products") return lowStockQb;
        if (table === "order_items") return topProductsQb;
        return ordersQb;
      });

      const result = await service.getDashboard();

      expect(result.revenue.current).toBe(0);
      expect(result.revenue.previous).toBe(0);
      expect(result.revenue.change).toBe(0);
      expect(result.orders.current).toBe(0);
      expect(result.customers.total).toBe(0);
      expect(result.products.total).toBe(0);
      expect(result.top_products).toEqual([]);
    });
  });
});
