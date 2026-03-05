import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy } from "@nestjs/microservices";
import { of } from "rxjs";
import { CategoriesGatewayController } from "./categories.controller";
import { SERVICE_NAMES, CATEGORIES_PATTERNS } from "@app/shared";
import { AdminGuard } from "../guards/admin.guard";

describe("CategoriesGatewayController", () => {
  let controller: CategoriesGatewayController;
  let productsClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesGatewayController],
      providers: [
        {
          provide: SERVICE_NAMES.PRODUCTS,
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

    controller = module.get<CategoriesGatewayController>(
      CategoriesGatewayController,
    );
    productsClient = module.get(SERVICE_NAMES.PRODUCTS);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("debe solicitar todas las categorías", async () => {
      const expected = [{ id: "1", name: "Cat1" }];
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.findAll();
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        CATEGORIES_PATTERNS.FIND_ALL,
        {},
      );
    });
  });

  describe("findOne", () => {
    it("debe solicitar una categoría por ID", async () => {
      const expected = { id: "cat-1", name: "Cat" };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.findOne("cat-1");
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        CATEGORIES_PATTERNS.FIND_ONE,
        { id: "cat-1" },
      );
    });
  });

  describe("create", () => {
    it("debe crear una categoría", async () => {
      const dto = { name: "Nueva" } as any;
      const expected = { id: "new-1", name: "Nueva" };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.create(dto);
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        CATEGORIES_PATTERNS.CREATE,
        dto,
      );
    });
  });

  describe("update", () => {
    it("debe actualizar una categoría", async () => {
      const dto = { name: "Actualizada" } as any;
      const expected = { id: "cat-1", name: "Actualizada" };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.update("cat-1", dto);
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        CATEGORIES_PATTERNS.UPDATE,
        { id: "cat-1", dto },
      );
    });
  });

  describe("remove", () => {
    it("debe eliminar una categoría", async () => {
      const expected = { message: "Eliminada" };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.remove("cat-1");
      expect(result).toEqual(expected);
    });
  });

  describe("restore", () => {
    it("debe restaurar una categoría", async () => {
      const expected = { message: "Restaurada" };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.restore("cat-1");
      expect(result).toEqual(expected);
    });
  });
});
