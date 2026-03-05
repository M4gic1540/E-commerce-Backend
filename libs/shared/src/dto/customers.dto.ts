import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationDto } from "./pagination.dto";

export class QueryCustomerDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Buscar por nombre o email" })
  @IsOptional()
  @IsString()
  search?: string;
}
