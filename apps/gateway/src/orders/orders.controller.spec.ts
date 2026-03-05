import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy } from "@nestjs/microservices";
import { of } from "rxjs";
import { OrdersGatewayController } from "./orders.controller";
import { SERVICE_NAMES, ORDERS_PATTERNS } from "@app/shared";
import { AdminGuard } from "../guards/admin.guard";

describe("OrdersGatewayController", () => {
  let controller: OrdersGatewayController;
  let ordersClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersGatewayController],
      providers: [
        {
          provide: SERVICE_NAMES.ORDERS,
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

    controller = module.get<OrdersGatewayController>(OrdersGatewayController);
    ordersClient = module.get(SERVICE_NAMES.ORDERS);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("debe solicitar todos los pedidos", async () => {
      const query = { page: 1, status: "pending" } as any;
      const expected = { data: [], total: 0 };
      ordersClient.send.mockReturnValue(of(expected));

      const result = await controller.findAll(query);
      expect(result).toEqual(expected);
      expect(ordersClient.send).toHaveBeenCalledWith(
        ORDERS_PATTERNS.FIND_ALL,
        query,
      );
    });
  });

  describe("findMyOrders", () => {
    it("debe solicitar pedidos del usuario autenticado", async () => {
      const query = { page: 1 } as any;
      const req = { user: { id: "user-1" } };
      const expected = { data: [], total: 0 };
      ordersClient.send.mockReturnValue(of(expected));

      const result = await controller.findMyOrders(query, req);
      expect(result).toEqual(expected);
      expect(ordersClient.send).toHaveBeenCalledWith(
        ORDERS_PATTERNS.FIND_BY_CUSTOMER,
        {
          customerId: "user-1",
          query,
        },
      );
    });
  });

  describe("findOne", () => {
    it("debe solicitar un pedido por ID", async () => {
      const expected = { id: "o-1", total: 200 };
      ordersClient.send.mockReturnValue(of(expected));

      const result = await controller.findOne("o-1");
      expect(result).toEqual(expected);
    });
  });

  describe("create", () => {
    it("debe crear un pedido con el userId del request", async () => {
      const dto = { items: [{ product_id: "p-1", quantity: 1 }] } as any;
      const req = { user: { id: "user-1" } };
      const expected = { id: "o-1", order_number: "PED-123" };
      ordersClient.send.mockReturnValue(of(expected));

      const result = await controller.create(dto, req);
      expect(result).toEqual(expected);
      expect(ordersClient.send).toHaveBeenCalledWith(ORDERS_PATTERNS.CREATE, {
        userId: "user-1",
        dto,
      });
    });
  });

  describe("updateStatus", () => {
    it("debe actualizar el estado del pedido", async () => {
      const dto = { status: "shipped" } as any;
      const expected = { id: "o-1", status: "shipped" };
      ordersClient.send.mockReturnValue(of(expected));

      const result = await controller.updateStatus("o-1", dto);
      expect(result).toEqual(expected);
    });
  });

  describe("cancel", () => {
    it("debe cancelar un pedido", async () => {
      const expected = { id: "o-1", status: "cancelled" };
      ordersClient.send.mockReturnValue(of(expected));

      const result = await controller.cancel("o-1");
      expect(result).toEqual(expected);
    });
  });
});
