import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CART_PATTERNS } from "@app/shared";
import { CartService } from "./cart.service";

@Controller()
export class CartController {
  constructor(private cartService: CartService) {}

  @MessagePattern(CART_PATTERNS.GET_CART)
  getCart(@Payload() data: { customerId: string }) {
    return this.cartService.getCart(data.customerId);
  }

  @MessagePattern(CART_PATTERNS.ADD_ITEM)
  addItem(@Payload() data: { customerId: string; dto: any }) {
    return this.cartService.addItem(data.customerId, data.dto);
  }

  @MessagePattern(CART_PATTERNS.UPDATE_QUANTITY)
  updateQuantity(
    @Payload() data: { customerId: string; itemId: string; quantity: number },
  ) {
    return this.cartService.updateQuantity(
      data.customerId,
      data.itemId,
      data.quantity,
    );
  }

  @MessagePattern(CART_PATTERNS.REMOVE_ITEM)
  removeItem(@Payload() data: { customerId: string; itemId: string }) {
    return this.cartService.removeItem(data.customerId, data.itemId);
  }

  @MessagePattern(CART_PATTERNS.CLEAR_CART)
  clearCart(@Payload() data: { customerId: string }) {
    return this.cartService.clearCart(data.customerId);
  }
}
