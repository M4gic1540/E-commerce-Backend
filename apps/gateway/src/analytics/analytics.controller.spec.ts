import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy } from "@nestjs/microservices";
import { of } from "rxjs";
import { AnalyticsGatewayController } from "./analytics.controller";
import { SERVICE_NAMES, ANALYTICS_PATTERNS } from "@app/shared";
import { AdminGuard } from "../guards/admin.guard";

describe("AnalyticsGatewayController", () => {
  let controller: AnalyticsGatewayController;
  let analyticsClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsGatewayController],
      providers: [
        {
          provide: SERVICE_NAMES.ANALYTICS,
          useValue: { send: jest.fn() },
        },
        {
          provide: SERVICE_NAMES.AUTH,
          useValue: { send: jest.fn() },
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticsGatewayController>(
      AnalyticsGatewayController,
    );
    analyticsClient = module.get(SERVICE_NAMES.ANALYTICS);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("getDashboard", () => {
    it("debe solicitar datos del dashboard", async () => {
      const expected = {
        revenue: { current: 1000, previous: 800, change: 25 },
        orders: { current: 10 },
        customers: { total: 50 },
        products: { total: 100 },
      };
      analyticsClient.send.mockReturnValue(of(expected));

      const result = await controller.getDashboard();
      expect(result).toEqual(expected);
      expect(analyticsClient.send).toHaveBeenCalledWith(
        ANALYTICS_PATTERNS.DASHBOARD,
        {},
      );
    });
  });
});
