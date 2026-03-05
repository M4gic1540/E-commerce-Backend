import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  SERVICE_NAMES,
  CUSTOMERS_PATTERNS,
  QueryCustomerDto,
} from "@app/shared";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { AdminGuard } from "../guards/admin.guard";

@ApiTags("Customers")
@Controller("customers")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomersGatewayController {
  constructor(
    @Inject(SERVICE_NAMES.CUSTOMERS) private customersClient: ClientProxy,
  ) {}

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Listar clientes (admin)" })
  findAll(@Query() query: QueryCustomerDto) {
    return firstValueFrom(
      this.customersClient.send(CUSTOMERS_PATTERNS.FIND_ALL, query),
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener un cliente por ID" })
  findOne(@Param("id") id: string) {
    return firstValueFrom(
      this.customersClient.send(CUSTOMERS_PATTERNS.FIND_ONE, { id }),
    );
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "Obtener estadísticas de un cliente" })
  getStats(@Param("id") id: string) {
    return firstValueFrom(
      this.customersClient.send(CUSTOMERS_PATTERNS.GET_STATS, { id }),
    );
  }

  @Put(":id")
  @ApiOperation({ summary: "Actualizar perfil del cliente" })
  update(
    @Param("id") id: string,
    @Body() data: { name?: string; phone?: string; avatar?: string },
  ) {
    return firstValueFrom(
      this.customersClient.send(CUSTOMERS_PATTERNS.UPDATE, { id, dto: data }),
    );
  }
}
