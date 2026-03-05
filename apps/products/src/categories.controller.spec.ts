import { Test, TestingModule } from "@nestjs/testing";
import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";

describe("CategoriesController", () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            restore: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get(CategoriesService);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("debe retornar todas las categorías", async () => {
      const expected = [{ id: "1", name: "Cat1", product_count: 5 }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();
      expect(result).toEqual(expected);
    });
  });

  describe("findOne", () => {
    it("debe retornar una categoría por ID", async () => {
      const expected = { id: "cat-1", name: "Cat" };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne({ id: "cat-1" });
      expect(result).toEqual(expected);
    });
  });

  describe("create", () => {
    it("debe crear una categoría", async () => {
      const dto = { name: "Nueva" };
      const expected = { id: "new-1", name: "Nueva" };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto);
      expect(result).toEqual(expected);
    });
  });

  describe("update", () => {
    it("debe actualizar una categoría", async () => {
      const expected = { id: "cat-1", name: "Actualizada" };
      service.update.mockResolvedValue(expected);

      const result = await controller.update({
        id: "cat-1",
        dto: { name: "Actualizada" },
      });
      expect(result).toEqual(expected);
    });
  });

  describe("remove", () => {
    it("debe eliminar una categoría", async () => {
      const expected = { message: "Eliminada" };
      service.remove.mockResolvedValue(expected);

      const result = await controller.remove({ id: "cat-1" });
      expect(result).toEqual(expected);
    });
  });

  describe("restore", () => {
    it("debe restaurar una categoría", async () => {
      const expected = { message: "Restaurada", data: {} };
      service.restore.mockResolvedValue(expected);

      const result = await controller.restore({ id: "cat-1" });
      expect(result).toEqual(expected);
    });
  });
});
