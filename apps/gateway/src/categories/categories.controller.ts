import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  SERVICE_NAMES,
  CATEGORIES_PATTERNS,
  CreateCategoryDto,
  UpdateCategoryDto,
} from "@app/shared";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { AdminGuard } from "../guards/admin.guard";

@ApiTags("Categories")
@Controller("categories")
export class CategoriesGatewayController {
  constructor(
    @Inject(SERVICE_NAMES.PRODUCTS) private productsClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar todas las categorías" })
  findAll() {
    return firstValueFrom(
      this.productsClient.send(CATEGORIES_PATTERNS.FIND_ALL, {}),
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener una categoría por ID" })
  findOne(@Param("id") id: string) {
    return firstValueFrom(
      this.productsClient.send(CATEGORIES_PATTERNS.FIND_ONE, { id }),
    );
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Crear una categoría (admin)" })
  create(@Body() dto: CreateCategoryDto) {
    return firstValueFrom(
      this.productsClient.send(CATEGORIES_PATTERNS.CREATE, dto),
    );
  }

  @Put(":id")
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar una categoría (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return firstValueFrom(
      this.productsClient.send(CATEGORIES_PATTERNS.UPDATE, { id, dto }),
    );
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Eliminar una categoría (admin, soft delete)" })
  remove(@Param("id") id: string) {
    return firstValueFrom(
      this.productsClient.send(CATEGORIES_PATTERNS.REMOVE, { id }),
    );
  }

  @Patch(":id/restore")
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Restaurar una categoría eliminada (admin)" })
  restore(@Param("id") id: string) {
    return firstValueFrom(
      this.productsClient.send(CATEGORIES_PATTERNS.RESTORE, { id }),
    );
  }
}
