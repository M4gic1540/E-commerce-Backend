import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { PaginationDto } from "./pagination.dto";

export class CreateProductDto {
  @ApiProperty({ example: "Auriculares Inalámbricos" })
  @IsString()
  name: string;

  @ApiProperty({ example: "uuid-de-categoria" })
  @IsString()
  category_id: string;

  @ApiProperty({ example: 79.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 99.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  original_price?: number;

  @ApiProperty({ example: "Auriculares premium con cancelación de ruido" })
  @IsString()
  description: string;

  @ApiProperty({ example: ["https://example.com/img1.jpg"] })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: { color: ["Negro", "Blanco"] } })
  @IsOptional()
  @IsObject()
  variants?: Record<string, string[]>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class QueryProductDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filtrar por categoría (ID)" })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({ description: "Buscar por nombre" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Precio mínimo" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_price?: number;

  @ApiPropertyOptional({ description: "Precio máximo" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_price?: number;

  @ApiPropertyOptional({ description: "Rating mínimo (1-5)" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  min_rating?: number;

  @ApiPropertyOptional({
    description: "Solo productos destacados",
    default: false,
  })
  @IsOptional()
  featured?: boolean;

  @ApiPropertyOptional({
    description: "Ordenar por",
    enum: ["price_asc", "price_desc", "rating", "newest", "name"],
  })
  @IsOptional()
  @IsString()
  sort?: "price_asc" | "price_desc" | "rating" | "newest" | "name";
}
