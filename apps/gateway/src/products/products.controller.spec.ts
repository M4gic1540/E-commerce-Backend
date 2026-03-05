import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy } from "@nestjs/microservices";
import { of } from "rxjs";
import { ProductsGatewayController } from "./products.controller";
import { SERVICE_NAMES, PRODUCTS_PATTERNS } from "@app/shared";
import { AdminGuard } from "../guards/admin.guard";

describe("ProductsGatewayController", () => {
  let controller: ProductsGatewayController;
  let productsClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsGatewayController],
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

    controller = module.get<ProductsGatewayController>(
      ProductsGatewayController,
    );
    productsClient = module.get(SERVICE_NAMES.PRODUCTS);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("debe enviar query al servicio de productos", async () => {
      const query = { page: 1, limit: 12 } as any;
      const expected = { data: [], total: 0 };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.findAll(query);
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        PRODUCTS_PATTERNS.FIND_ALL,
        query,
      );
    });
  });

  describe("findFeatured", () => {
    it("debe solicitar productos destacados", async () => {
      const expected = [{ id: "1", featured: true }];
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.findFeatured();
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        PRODUCTS_PATTERNS.FIND_FEATURED,
        {},
      );
    });
  });

  describe("findOne", () => {
    it("debe solicitar un producto por ID", async () => {
      const expected = { id: "p-1", name: "Producto" };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.findOne("p-1");
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        PRODUCTS_PATTERNS.FIND_ONE,
        { id: "p-1" },
      );
    });
  });

  describe("create", () => {
    it("debe enviar datos de creación al servicio", async () => {
      const dto = { name: "Nuevo" } as any;
      const expected = { id: "new-1", name: "Nuevo" };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.create(dto);
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        PRODUCTS_PATTERNS.CREATE,
        dto,
      );
    });
  });

  describe("update", () => {
    it("debe enviar datos de actualización", async () => {
      const dto = { name: "Actualizado" } as any;
      const expected = { id: "p-1", name: "Actualizado" };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.update("p-1", dto);
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        PRODUCTS_PATTERNS.UPDATE,
        { id: "p-1", dto },
      );
    });
  });

  describe("remove", () => {
    it("debe solicitar eliminación de un producto", async () => {
      const expected = { message: "Eliminado" };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.remove("p-1");
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        PRODUCTS_PATTERNS.REMOVE,
        { id: "p-1" },
      );
    });
  });

  describe("restore", () => {
    it("debe solicitar restauración de un producto", async () => {
      const expected = { message: "Restaurado" };
      productsClient.send.mockReturnValue(of(expected));

      const result = await controller.restore("p-1");
      expect(result).toEqual(expected);
      expect(productsClient.send).toHaveBeenCalledWith(
        PRODUCTS_PATTERNS.RESTORE,
        { id: "p-1" },
      );
    });
  });
});
