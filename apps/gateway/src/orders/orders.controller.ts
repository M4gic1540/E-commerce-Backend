import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Inject,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  SERVICE_NAMES,
  ORDERS_PATTERNS,
  CreateOrderDto,
  UpdateOrderStatusDto,
  QueryOrderDto,
  PaginationDto,
} from "@app/shared";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { AdminGuard } from "../guards/admin.guard";

@ApiTags("Orders")
@Controller("orders")
export class OrdersGatewayController {
  constructor(
    @Inject(SERVICE_NAMES.ORDERS) private ordersClient: ClientProxy,
  ) {}

  @Get()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar pedidos (admin)" })
  findAll(@Query() query: QueryOrderDto) {
    return firstValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.FIND_ALL, query),
    );
  }

  @Get("my-orders")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener mis pedidos" })
  findMyOrders(@Query() query: PaginationDto, @Req() req: any) {
    return firstValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.FIND_BY_CUSTOMER, {
        customerId: req.user.id,
        query,
      }),
    );
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener detalle de un pedido" })
  findOne(@Param("id") id: string) {
    return firstValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.FIND_ONE, { id }),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Crear un nuevo pedido" })
  create(@Body() dto: CreateOrderDto, @Req() req: any) {
    return firstValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.CREATE, {
        userId: req.user.id,
        dto,
      }),
    );
  }

  @Put(":id/status")
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar estado del pedido (admin)" })
  updateStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return firstValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.UPDATE_STATUS, { id, dto }),
    );
  }

  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancelar un pedido" })
  cancel(@Param("id") id: string) {
    return firstValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.CANCEL, { id }),
    );
  }

  @Get(":id/receipt")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener boleta PDF del pedido (URL firmada)" })
  getReceipt(@Param("id") id: string) {
    return firstValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.GET_RECEIPT, { id }),
    );
  }

  @Post(":id/receipt/regenerate")
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Regenerar boleta PDF del pedido (admin)" })
  generateReceipt(@Param("id") id: string) {
    return firstValueFrom(
      this.ordersClient.send(ORDERS_PATTERNS.GENERATE_RECEIPT, { id }),
    );
  }
}
