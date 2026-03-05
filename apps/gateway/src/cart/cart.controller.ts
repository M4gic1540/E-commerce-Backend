import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Inject,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import { SERVICE_NAMES, CART_PATTERNS, AddToCartDto } from "@app/shared";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

@ApiTags("Cart")
@Controller("cart")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartGatewayController {
  constructor(@Inject(SERVICE_NAMES.CART) private cartClient: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: "Obtener el carrito del usuario" })
  getCart(@Req() req: any) {
    return firstValueFrom(
      this.cartClient.send(CART_PATTERNS.GET_CART, { customerId: req.user.id }),
    );
  }

  @Post("items")
  @ApiOperation({ summary: "Agregar producto al carrito" })
  addItem(@Req() req: any, @Body() dto: AddToCartDto) {
    return firstValueFrom(
      this.cartClient.send(CART_PATTERNS.ADD_ITEM, {
        customerId: req.user.id,
        dto,
      }),
    );
  }

  @Put("items/:itemId")
  @ApiOperation({ summary: "Actualizar cantidad de un item" })
  updateQuantity(
    @Req() req: any,
    @Param("itemId") itemId: string,
    @Body("quantity") quantity: number,
  ) {
    return firstValueFrom(
      this.cartClient.send(CART_PATTERNS.UPDATE_QUANTITY, {
        customerId: req.user.id,
        itemId,
        quantity,
      }),
    );
  }

  @Delete("items/:itemId")
  @ApiOperation({ summary: "Eliminar un item del carrito" })
  removeItem(@Req() req: any, @Param("itemId") itemId: string) {
    return firstValueFrom(
      this.cartClient.send(CART_PATTERNS.REMOVE_ITEM, {
        customerId: req.user.id,
        itemId,
      }),
    );
  }

  @Delete()
  @ApiOperation({ summary: "Vaciar el carrito" })
  clearCart(@Req() req: any) {
    return firstValueFrom(
      this.cartClient.send(CART_PATTERNS.CLEAR_CART, {
        customerId: req.user.id,
      }),
    );
  }
}
