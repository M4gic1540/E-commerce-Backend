import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
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
  PRODUCTS_PATTERNS,
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
} from "@app/shared";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { AdminGuard } from "../guards/admin.guard";

@ApiTags("Products")
@Controller("products")
export class ProductsGatewayController {
  constructor(
    @Inject(SERVICE_NAMES.PRODUCTS) private productsClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar productos con filtros y paginación" })
  findAll(@Query() query: QueryProductDto) {
    return firstValueFrom(
      this.productsClient.send(PRODUCTS_PATTERNS.FIND_ALL, query),
    );
  }

  @Get("featured")
  @ApiOperation({ summary: "Obtener productos destacados" })
  findFeatured() {
    return firstValueFrom(
      this.productsClient.send(PRODUCTS_PATTERNS.FIND_FEATURED, {}),
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener un producto por ID" })
  findOne(@Param("id") id: string) {
    return firstValueFrom(
      this.productsClient.send(PRODUCTS_PATTERNS.FIND_ONE, { id }),
    );
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Crear un nuevo producto (admin)" })
  create(@Body() dto: CreateProductDto) {
    return firstValueFrom(
      this.productsClient.send(PRODUCTS_PATTERNS.CREATE, dto),
    );
  }

  @Put(":id")
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar un producto (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return firstValueFrom(
      this.productsClient.send(PRODUCTS_PATTERNS.UPDATE, { id, dto }),
    );
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Eliminar un producto (admin, soft delete)" })
  remove(@Param("id") id: string) {
    return firstValueFrom(
      this.productsClient.send(PRODUCTS_PATTERNS.REMOVE, { id }),
    );
  }

  @Patch(":id/restore")
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Restaurar un producto eliminado (admin)" })
  restore(@Param("id") id: string) {
    return firstValueFrom(
      this.productsClient.send(PRODUCTS_PATTERNS.RESTORE, { id }),
    );
  }
}
