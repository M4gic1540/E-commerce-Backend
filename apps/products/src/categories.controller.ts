import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CATEGORIES_PATTERNS } from "@app/shared";
import { CategoriesService } from "./categories.service";

@Controller()
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @MessagePattern(CATEGORIES_PATTERNS.FIND_ALL)
  findAll() {
    return this.categoriesService.findAll();
  }

  @MessagePattern(CATEGORIES_PATTERNS.FIND_ONE)
  findOne(@Payload() data: { id: string }) {
    return this.categoriesService.findOne(data.id);
  }

  @MessagePattern(CATEGORIES_PATTERNS.CREATE)
  create(@Payload() dto: any) {
    return this.categoriesService.create(dto);
  }

  @MessagePattern(CATEGORIES_PATTERNS.UPDATE)
  update(@Payload() data: { id: string; dto: any }) {
    return this.categoriesService.update(data.id, data.dto);
  }

  @MessagePattern(CATEGORIES_PATTERNS.REMOVE)
  remove(@Payload() data: { id: string }) {
    return this.categoriesService.remove(data.id);
  }

  @MessagePattern(CATEGORIES_PATTERNS.RESTORE)
  restore(@Payload() data: { id: string }) {
    return this.categoriesService.restore(data.id);
  }
}
