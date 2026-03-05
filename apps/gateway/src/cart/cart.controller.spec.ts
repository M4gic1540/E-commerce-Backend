import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy } from "@nestjs/microservices";
import { of } from "rxjs";
import { CartGatewayController } from "./cart.controller";
import { SERVICE_NAMES, CART_PATTERNS } from "@app/shared";

describe("CartGatewayController", () => {
  let controller: CartGatewayController;
  let cartClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartGatewayController],
      providers: [
        {
          provide: SERVICE_NAMES.CART,
          useValue: { send: jest.fn() },
        },
        {
          provide: SERVICE_NAMES.AUTH,
          useValue: { send: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<CartGatewayController>(CartGatewayController);
    cartClient = module.get(SERVICE_NAMES.CART);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("getCart", () => {
    it("debe solicitar el carrito del usuario", async () => {
      const req = { user: { id: "user-1" } };
      const expected = { items: [], total_items: 0, total_price: 0 };
      cartClient.send.mockReturnValue(of(expected));

      const result = await controller.getCart(req);
      expect(result).toEqual(expected);
      expect(cartClient.send).toHaveBeenCalledWith(CART_PATTERNS.GET_CART, {
        customerId: "user-1",
      });
    });
  });

  describe("addItem", () => {
    it("debe agregar un item al carrito", async () => {
      const req = { user: { id: "user-1" } };
      const dto = { product_id: "p-1", quantity: 2 } as any;
      const expected = { id: "ci-1", product_id: "p-1", quantity: 2 };
      cartClient.send.mockReturnValue(of(expected));

      const result = await controller.addItem(req, dto);
      expect(result).toEqual(expected);
      expect(cartClient.send).toHaveBeenCalledWith(CART_PATTERNS.ADD_ITEM, {
        customerId: "user-1",
        dto,
      });
    });
  });

  describe("updateQuantity", () => {
    it("debe actualizar la cantidad de un item", async () => {
      const req = { user: { id: "user-1" } };
      const expected = { id: "ci-1", quantity: 5 };
      cartClient.send.mockReturnValue(of(expected));

      const result = await controller.updateQuantity(req, "ci-1", 5);
      expect(result).toEqual(expected);
      expect(cartClient.send).toHaveBeenCalledWith(
        CART_PATTERNS.UPDATE_QUANTITY,
        {
          customerId: "user-1",
          itemId: "ci-1",
          quantity: 5,
        },
      );
    });
  });

  describe("removeItem", () => {
    it("debe eliminar un item del carrito", async () => {
      const req = { user: { id: "user-1" } };
      const expected = { message: "Item eliminado" };
      cartClient.send.mockReturnValue(of(expected));

      const result = await controller.removeItem(req, "ci-1");
      expect(result).toEqual(expected);
      expect(cartClient.send).toHaveBeenCalledWith(CART_PATTERNS.REMOVE_ITEM, {
        customerId: "user-1",
        itemId: "ci-1",
      });
    });
  });

  describe("clearCart", () => {
    it("debe vaciar el carrito", async () => {
      const req = { user: { id: "user-1" } };
      const expected = { message: "Carrito vacío" };
      cartClient.send.mockReturnValue(of(expected));

      const result = await controller.clearCart(req);
      expect(result).toEqual(expected);
      expect(cartClient.send).toHaveBeenCalledWith(CART_PATTERNS.CLEAR_CART, {
        customerId: "user-1",
      });
    });
  });
});
