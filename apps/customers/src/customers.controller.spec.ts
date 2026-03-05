import { Test, TestingModule } from "@nestjs/testing";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

describe("CustomersController", () => {
  let controller: CustomersController;
  let service: jest.Mocked<CustomersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            getStats: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get(CustomersService);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("debe retornar clientes paginados", async () => {
      const expected = {
        data: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
      };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll({ search: "juan" });
      expect(result).toEqual(expected);
    });
  });

  describe("findOne", () => {
    it("debe retornar un cliente", async () => {
      const expected = { id: "c-1", name: "Juan" };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne({ id: "c-1" });
      expect(result).toEqual(expected);
    });
  });

  describe("getStats", () => {
    it("debe retornar estadísticas", async () => {
      const expected = {
        total_orders: 5,
        total_spent: 500,
        delivered_orders: 3,
      };
      service.getStats.mockResolvedValue(expected);

      const result = await controller.getStats({ id: "c-1" });
      expect(result).toEqual(expected);
    });
  });

  describe("update", () => {
    it("debe actualizar un cliente", async () => {
      const expected = { id: "c-1", name: "Actualizado" };
      service.update.mockResolvedValue(expected);

      const result = await controller.update({
        id: "c-1",
        dto: { name: "Actualizado" },
      });
      expect(result).toEqual(expected);
    });
  });
});
