import { Test, TestingModule } from "@nestjs/testing";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

describe("AnalyticsController", () => {
  let controller: AnalyticsController;
  let service: jest.Mocked<AnalyticsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: {
            getDashboard: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get(AnalyticsService);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("getDashboard", () => {
    it("debe retornar datos del dashboard", async () => {
      const expected = {
        revenue: { current: 1000, previous: 800, change: 25 },
        orders: {
          current: 10,
          previous: 8,
          change: 25,
          by_status: {
            pending: 2,
            processing: 1,
            shipped: 3,
            delivered: 3,
            cancelled: 1,
          },
        },
        customers: { total: 50 },
        products: { total: 100, low_stock: [] },
        sales_by_month: [],
        top_products: [],
      };
      service.getDashboard.mockResolvedValue(expected);

      const result = await controller.getDashboard();
      expect(result).toEqual(expected);
    });
  });
});
