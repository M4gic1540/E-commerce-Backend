import { Test, TestingModule } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { CartService } from "./cart.service";
import { SupabaseService } from "@app/shared";

describe("CartService", () => {
  let service: CartService;

  const mockAdminClient: any = {
    from: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
          },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it("debe estar definido", () => {
    expect(service).toBeDefined();
  });

  // ─── GET CART ────────────────────────────────────────────
  describe("getCart", () => {
    it("debe retornar el carrito con totales", async () => {
      const mockItems = [
        {
          id: "ci-1",
          product_id: "p-1",
          quantity: 2,
          products: {
            id: "p-1",
            name: "Producto",
            price: 50,
            original_price: 60,
            images: [],
            stock: 10,
          },
        },
        {
          id: "ci-2",
          product_id: "p-2",
          quantity: 1,
          products: {
            id: "p-2",
            name: "Producto 2",
            price: 30,
            original_price: null,
            images: [],
            stock: 5,
          },
        },
      ];

      const qb: any = {};
      ["select", "eq", "is", "order"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.order = jest.fn().mockResolvedValue({ data: mockItems, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.getCart("cust-1");

      expect(result.items).toHaveLength(2);
      expect(result.total_items).toBe(3); // 2 + 1
      expect(result.total_price).toBe(130); // 50*2 + 30*1
      expect(result.items[0].product).toEqual(mockItems[0].products);
    });

    it("debe retornar carrito vacío si no hay items", async () => {
      const qb: any = {};
      ["select", "eq", "is", "order"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.order = jest.fn().mockResolvedValue({ data: null, error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.getCart("cust-1");
      expect(result.items).toEqual([]);
      expect(result.total_items).toBe(0);
      expect(result.total_price).toBe(0);
    });
  });

  // ─── ADD ITEM ────────────────────────────────────────────
  describe("addItem", () => {
    it("debe agregar un producto nuevo al carrito", async () => {
      const dto = { product_id: "p-1", quantity: 1 };
      const addedItem = {
        id: "ci-new",
        customer_id: "cust-1",
        product_id: "p-1",
        quantity: 1,
      };

      // Check product exists
      const prodQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        prodQb[m] = jest.fn().mockReturnValue(prodQb);
      });
      prodQb.single = jest.fn().mockResolvedValue({
        data: { id: "p-1", stock: 10, name: "Producto" },
        error: null,
      });

      // Check existing cart item
      const existingQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        existingQb[m] = jest.fn().mockReturnValue(existingQb);
      });
      existingQb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      // Check soft-deleted item
      const softDeletedQb: any = {};
      ["select", "eq", "not"].forEach((m) => {
        softDeletedQb[m] = jest.fn().mockReturnValue(softDeletedQb);
      });
      softDeletedQb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      // Insert new
      const insertQb: any = {};
      insertQb.insert = jest.fn().mockReturnValue(insertQb);
      insertQb.select = jest.fn().mockReturnValue(insertQb);
      insertQb.single = jest
        .fn()
        .mockResolvedValue({ data: addedItem, error: null });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return prodQb; // product check
        if (callCount === 2) return existingQb; // existing check
        if (callCount === 3) return softDeletedQb; // soft-deleted check
        return insertQb; // insert
      });

      const result = await service.addItem("cust-1", dto);
      expect(result).toEqual(addedItem);
    });

    it("debe actualizar cantidad si el producto ya está en el carrito", async () => {
      const dto = { product_id: "p-1", quantity: 2 };
      const updatedItem = { id: "ci-1", quantity: 5 };

      // Product check
      const prodQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        prodQb[m] = jest.fn().mockReturnValue(prodQb);
      });
      prodQb.single = jest.fn().mockResolvedValue({
        data: { id: "p-1", stock: 10, name: "Producto" },
        error: null,
      });

      // Existing item found
      const existingQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        existingQb[m] = jest.fn().mockReturnValue(existingQb);
      });
      existingQb.single = jest.fn().mockResolvedValue({
        data: { id: "ci-1", quantity: 3 },
        error: null,
      });

      // Update quantity
      const updateQb: any = {};
      updateQb.update = jest.fn().mockReturnValue(updateQb);
      updateQb.eq = jest.fn().mockReturnValue(updateQb);
      updateQb.select = jest.fn().mockReturnValue(updateQb);
      updateQb.single = jest
        .fn()
        .mockResolvedValue({ data: updatedItem, error: null });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return prodQb;
        if (callCount === 2) return existingQb;
        return updateQb;
      });

      const result = await service.addItem("cust-1", dto);
      expect(result).toEqual(updatedItem);
    });

    it("debe lanzar RpcException si el producto no existe", async () => {
      const prodQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        prodQb[m] = jest.fn().mockReturnValue(prodQb);
      });
      prodQb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Not found" } });
      mockAdminClient.from.mockReturnValue(prodQb);

      await expect(
        service.addItem("cust-1", { product_id: "bad", quantity: 1 }),
      ).rejects.toThrow(RpcException);
    });

    it("debe lanzar RpcException si no hay stock suficiente", async () => {
      const prodQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        prodQb[m] = jest.fn().mockReturnValue(prodQb);
      });
      prodQb.single = jest.fn().mockResolvedValue({
        data: { id: "p-1", stock: 1, name: "Producto" },
        error: null,
      });
      mockAdminClient.from.mockReturnValue(prodQb);

      await expect(
        service.addItem("cust-1", { product_id: "p-1", quantity: 5 }),
      ).rejects.toThrow(RpcException);
    });

    it("debe restaurar un item soft-deleted", async () => {
      const dto = { product_id: "p-1", quantity: 2 };
      const restoredItem = { id: "ci-old", quantity: 2, deleted_at: null };

      // Product check
      const prodQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        prodQb[m] = jest.fn().mockReturnValue(prodQb);
      });
      prodQb.single = jest.fn().mockResolvedValue({
        data: { id: "p-1", stock: 10, name: "Producto" },
        error: null,
      });

      // No existing active item
      const existingQb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        existingQb[m] = jest.fn().mockReturnValue(existingQb);
      });
      existingQb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      // Found soft-deleted item
      const softDeletedQb: any = {};
      ["select", "eq", "not"].forEach((m) => {
        softDeletedQb[m] = jest.fn().mockReturnValue(softDeletedQb);
      });
      softDeletedQb.single = jest.fn().mockResolvedValue({
        data: { id: "ci-old" },
        error: null,
      });

      // Restore (update)
      const restoreQb: any = {};
      restoreQb.update = jest.fn().mockReturnValue(restoreQb);
      restoreQb.eq = jest.fn().mockReturnValue(restoreQb);
      restoreQb.select = jest.fn().mockReturnValue(restoreQb);
      restoreQb.single = jest
        .fn()
        .mockResolvedValue({ data: restoredItem, error: null });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return prodQb;
        if (callCount === 2) return existingQb;
        if (callCount === 3) return softDeletedQb;
        return restoreQb;
      });

      const result = await service.addItem("cust-1", dto);
      expect(result).toEqual(restoredItem);
    });
  });

  // ─── UPDATE QUANTITY ──────────────────────────────────────
  describe("updateQuantity", () => {
    it("debe actualizar la cantidad de un item", async () => {
      const qb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.single = jest.fn().mockResolvedValue({
        data: { id: "ci-1", products: { stock: 10 } },
        error: null,
      });

      const updateQb: any = {};
      updateQb.update = jest.fn().mockReturnValue(updateQb);
      updateQb.eq = jest.fn().mockReturnValue(updateQb);
      updateQb.select = jest.fn().mockReturnValue(updateQb);
      updateQb.single = jest.fn().mockResolvedValue({
        data: { id: "ci-1", quantity: 5 },
        error: null,
      });

      let callCount = 0;
      mockAdminClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? qb : updateQb;
      });

      const result = await service.updateQuantity("cust-1", "ci-1", 5);
      expect(result.quantity).toBe(5);
    });

    it("debe lanzar RpcException si el item no existe", async () => {
      const qb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Not found" } });
      mockAdminClient.from.mockReturnValue(qb);

      await expect(
        service.updateQuantity("cust-1", "bad-id", 5),
      ).rejects.toThrow(RpcException);
    });

    it("debe lanzar RpcException si excede el stock", async () => {
      const qb: any = {};
      ["select", "eq", "is"].forEach((m) => {
        qb[m] = jest.fn().mockReturnValue(qb);
      });
      qb.single = jest.fn().mockResolvedValue({
        data: { id: "ci-1", products: { stock: 3 } },
        error: null,
      });
      mockAdminClient.from.mockReturnValue(qb);

      await expect(
        service.updateQuantity("cust-1", "ci-1", 10),
      ).rejects.toThrow(RpcException);
    });
  });

  // ─── REMOVE ITEM ──────────────────────────────────────────
  describe("removeItem", () => {
    it("debe eliminar un item del carrito (soft delete)", async () => {
      const qb: any = {};
      qb.update = jest.fn().mockReturnValue(qb);
      qb.eq = jest.fn().mockReturnValue(qb);
      qb.is = jest.fn().mockResolvedValue({ error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.removeItem("cust-1", "ci-1");
      expect(result.message).toContain("eliminado del carrito");
    });
  });

  // ─── CLEAR CART ───────────────────────────────────────────
  describe("clearCart", () => {
    it("debe vaciar el carrito", async () => {
      const qb: any = {};
      qb.update = jest.fn().mockReturnValue(qb);
      qb.eq = jest.fn().mockReturnValue(qb);
      qb.is = jest.fn().mockResolvedValue({ error: null });
      mockAdminClient.from.mockReturnValue(qb);

      const result = await service.clearCart("cust-1");
      expect(result.message).toContain("Carrito vacío");
    });
  });
});
