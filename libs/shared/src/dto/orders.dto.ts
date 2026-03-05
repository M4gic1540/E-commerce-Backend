import {
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsOptional,
  IsObject,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationDto } from "./pagination.dto";

export class OrderItemDto {
  @ApiProperty({ example: "uuid-producto" })
  @IsString()
  product_id: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class ShippingAddressDto {
  @ApiProperty({ example: "Juan" })
  @IsString()
  first_name: string;

  @ApiProperty({ example: "García" })
  @IsString()
  last_name: string;

  @ApiProperty({ example: "Calle Principal 123" })
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: "Depto 4B" })
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiProperty({ example: "Ciudad de México" })
  @IsString()
  city: string;

  @ApiProperty({ example: "CDMX" })
  @IsString()
  state: string;

  @ApiProperty({ example: "06600" })
  @IsString()
  zip_code: string;

  @ApiProperty({ example: "México" })
  @IsString()
  country: string;

  @ApiPropertyOptional({ example: "+52 55 1234 5678" })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @IsObject()
  shipping_address: ShippingAddressDto;

  @ApiPropertyOptional({ example: "standard" })
  @IsOptional()
  @IsString()
  shipping_method?: string;

  @ApiPropertyOptional({ example: "card" })
  @IsOptional()
  @IsString()
  payment_method?: string;
}

export class QueryOrderDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Filtrar por estado",
    example: "pending",
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    example: "processing",
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
  })
  @IsString()
  @IsIn(["pending", "processing", "shipped", "delivered", "cancelled"])
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
}
