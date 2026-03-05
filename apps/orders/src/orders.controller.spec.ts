import { Test, TestingModule } from "@nestjs/testing";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

describe("OrdersController", () => {
  let controller: OrdersController;
  let service: jest.Mocked<OrdersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByCustomer: jest.fn(),
            create: jest.fn(),
            updateStatus: jest.fn(),
            cancel: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get(OrdersService);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("debe retornar pedidos paginados", async () => {
      const expected = {
        data: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
      };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll({ page: 1 });
      expect(result).toEqual(expected);
    });
  });

  describe("findOne", () => {
    it("debe retornar un pedido por ID", async () => {
      const expected = { id: "o-1", total: 100 };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne({ id: "o-1" });
      expect(result).toEqual(expected);
    });
  });

  describe("findByCustomer", () => {
    it("debe retornar pedidos de un cliente", async () => {
      const expected = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      service.findByCustomer.mockResolvedValue(expected);

      const result = await controller.findByCustomer({
        customerId: "cust-1",
        query: {},
      });
      expect(result).toEqual(expected);
      expect(service.findByCustomer).toHaveBeenCalledWith("cust-1", {});
    });
  });

  describe("create", () => {
    it("debe crear un pedido", async () => {
      const dto = {
        items: [{ product_id: "p-1", quantity: 1 }],
        shipping_address: {},
      };
      const expected = { id: "o-1", order_number: "PED-123" };
      service.create.mockResolvedValue(expected);

      const result = await controller.create({ userId: "user-1", dto });
      expect(result).toEqual(expected);
      expect(service.create).toHaveBeenCalledWith("user-1", dto);
    });
  });

  describe("updateStatus", () => {
    it("debe actualizar el estado", async () => {
      const expected = { id: "o-1", status: "shipped" };
      service.updateStatus.mockResolvedValue(expected);

      const result = await controller.updateStatus({
        id: "o-1",
        dto: { status: "shipped" },
      });
      expect(result).toEqual(expected);
    });
  });

  describe("cancel", () => {
    it("debe cancelar un pedido", async () => {
      const expected = { id: "o-1", status: "cancelled" };
      service.cancel.mockResolvedValue(expected);

      const result = await controller.cancel({ id: "o-1" });
      expect(result).toEqual(expected);
    });
  });
});
