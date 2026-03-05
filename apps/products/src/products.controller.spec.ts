import { Test, TestingModule } from "@nestjs/testing";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

describe("ProductsController", () => {
  let controller: ProductsController;
  let service: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            findFeatured: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            restore: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get(ProductsService);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("debe retornar productos paginados", async () => {
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

  describe("findFeatured", () => {
    it("debe retornar productos destacados", async () => {
      const expected = [{ id: "1", featured: true }];
      service.findFeatured.mockResolvedValue(expected);

      const result = await controller.findFeatured();
      expect(result).toEqual(expected);
    });
  });

  describe("findOne", () => {
    it("debe retornar un producto por ID", async () => {
      const expected = { id: "p-1", name: "Producto" };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne({ id: "p-1" });
      expect(result).toEqual(expected);
      expect(service.findOne).toHaveBeenCalledWith("p-1");
    });
  });

  describe("create", () => {
    it("debe crear un producto", async () => {
      const dto = { name: "Nuevo" };
      const expected = { id: "new-1", ...dto };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto);
      expect(result).toEqual(expected);
    });
  });

  describe("update", () => {
    it("debe actualizar un producto", async () => {
      const expected = { id: "p-1", name: "Actualizado" };
      service.update.mockResolvedValue(expected);

      const result = await controller.update({
        id: "p-1",
        dto: { name: "Actualizado" },
      });
      expect(result).toEqual(expected);
      expect(service.update).toHaveBeenCalledWith("p-1", {
        name: "Actualizado",
      });
    });
  });

  describe("remove", () => {
    it("debe eliminar un producto", async () => {
      const expected = { message: "Producto p-1 eliminado exitosamente" };
      service.remove.mockResolvedValue(expected);

      const result = await controller.remove({ id: "p-1" });
      expect(result).toEqual(expected);
    });
  });

  describe("restore", () => {
    it("debe restaurar un producto", async () => {
      const expected = { message: "Restaurado", data: { id: "p-1" } };
      service.restore.mockResolvedValue(expected);

      const result = await controller.restore({ id: "p-1" });
      expect(result).toEqual(expected);
    });
  });
});
