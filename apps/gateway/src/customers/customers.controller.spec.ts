import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy } from "@nestjs/microservices";
import { of } from "rxjs";
import { CustomersGatewayController } from "./customers.controller";
import { SERVICE_NAMES, CUSTOMERS_PATTERNS } from "@app/shared";
import { AdminGuard } from "../guards/admin.guard";

describe("CustomersGatewayController", () => {
  let controller: CustomersGatewayController;
  let customersClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersGatewayController],
      providers: [
        {
          provide: SERVICE_NAMES.CUSTOMERS,
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

    controller = module.get<CustomersGatewayController>(
      CustomersGatewayController,
    );
    customersClient = module.get(SERVICE_NAMES.CUSTOMERS);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("debe solicitar todos los clientes", async () => {
      const query = { search: "juan" } as any;
      const expected = { data: [], total: 0 };
      customersClient.send.mockReturnValue(of(expected));

      const result = await controller.findAll(query);
      expect(result).toEqual(expected);
      expect(customersClient.send).toHaveBeenCalledWith(
        CUSTOMERS_PATTERNS.FIND_ALL,
        query,
      );
    });
  });

  describe("findOne", () => {
    it("debe solicitar un cliente por ID", async () => {
      const expected = { id: "c-1", name: "Juan" };
      customersClient.send.mockReturnValue(of(expected));

      const result = await controller.findOne("c-1");
      expect(result).toEqual(expected);
    });
  });

  describe("getStats", () => {
    it("debe solicitar estadísticas del cliente", async () => {
      const expected = {
        total_orders: 5,
        total_spent: 500,
        delivered_orders: 3,
      };
      customersClient.send.mockReturnValue(of(expected));

      const result = await controller.getStats("c-1");
      expect(result).toEqual(expected);
      expect(customersClient.send).toHaveBeenCalledWith(
        CUSTOMERS_PATTERNS.GET_STATS,
        { id: "c-1" },
      );
    });
  });

  describe("update", () => {
    it("debe actualizar un cliente", async () => {
      const data = { name: "Actualizado" };
      const expected = { id: "c-1", name: "Actualizado" };
      customersClient.send.mockReturnValue(of(expected));

      const result = await controller.update("c-1", data);
      expect(result).toEqual(expected);
      expect(customersClient.send).toHaveBeenCalledWith(
        CUSTOMERS_PATTERNS.UPDATE,
        {
          id: "c-1",
          dto: data,
        },
      );
    });
  });
});
