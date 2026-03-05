import { Test, TestingModule } from "@nestjs/testing";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

describe("CartController", () => {
  let controller: CartController;
  let service: jest.Mocked<CartService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCart: jest.fn(),
            addItem: jest.fn(),
            updateQuantity: jest.fn(),
            removeItem: jest.fn(),
            clearCart: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    service = module.get(CartService);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("getCart", () => {
    it("debe retornar el carrito", async () => {
      const expected = { items: [], total_items: 0, total_price: 0 };
      service.getCart.mockResolvedValue(expected);

      const result = await controller.getCart({ customerId: "cust-1" });
      expect(result).toEqual(expected);
      expect(service.getCart).toHaveBeenCalledWith("cust-1");
    });
  });

  describe("addItem", () => {
    it("debe agregar un item al carrito", async () => {
      const dto = { product_id: "p-1", quantity: 2 };
      const expected = { id: "ci-1", product_id: "p-1", quantity: 2 };
      service.addItem.mockResolvedValue(expected);

      const result = await controller.addItem({ customerId: "cust-1", dto });
      expect(result).toEqual(expected);
      expect(service.addItem).toHaveBeenCalledWith("cust-1", dto);
    });
  });

  describe("updateQuantity", () => {
    it("debe actualizar la cantidad", async () => {
      const expected = { id: "ci-1", quantity: 5 };
      service.updateQuantity.mockResolvedValue(expected);

      const result = await controller.updateQuantity({
        customerId: "cust-1",
        itemId: "ci-1",
        quantity: 5,
      });
      expect(result).toEqual(expected);
      expect(service.updateQuantity).toHaveBeenCalledWith("cust-1", "ci-1", 5);
    });
  });

  describe("removeItem", () => {
    it("debe eliminar un item", async () => {
      const expected = { message: "Item eliminado del carrito" };
      service.removeItem.mockResolvedValue(expected);

      const result = await controller.removeItem({
        customerId: "cust-1",
        itemId: "ci-1",
      });
      expect(result).toEqual(expected);
    });
  });

  describe("clearCart", () => {
    it("debe vaciar el carrito", async () => {
      const expected = { message: "Carrito vacío" };
      service.clearCart.mockResolvedValue(expected);

      const result = await controller.clearCart({ customerId: "cust-1" });
      expect(result).toEqual(expected);
    });
  });
});
