import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { PRODUCTS_PATTERNS } from "@app/shared";
import { ProductsService } from "./products.service";

@Controller()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @MessagePattern(PRODUCTS_PATTERNS.FIND_ALL)
  findAll(@Payload() query: any) {
    return this.productsService.findAll(query);
  }

  @MessagePattern(PRODUCTS_PATTERNS.FIND_FEATURED)
  findFeatured() {
    return this.productsService.findFeatured();
  }

  @MessagePattern(PRODUCTS_PATTERNS.FIND_ONE)
  findOne(@Payload() data: { id: string }) {
    return this.productsService.findOne(data.id);
  }

  @MessagePattern(PRODUCTS_PATTERNS.CREATE)
  create(@Payload() dto: any) {
    return this.productsService.create(dto);
  }

  @MessagePattern(PRODUCTS_PATTERNS.UPDATE)
  update(@Payload() data: { id: string; dto: any }) {
    return this.productsService.update(data.id, data.dto);
  }

  @MessagePattern(PRODUCTS_PATTERNS.REMOVE)
  remove(@Payload() data: { id: string }) {
    return this.productsService.remove(data.id);
  }

  @MessagePattern(PRODUCTS_PATTERNS.RESTORE)
  restore(@Payload() data: { id: string }) {
    return this.productsService.restore(data.id);
  }
}
