import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({ example: "Electrónica" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: "https://example.com/cat-img.jpg" })
  @IsOptional()
  @IsString()
  image?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
