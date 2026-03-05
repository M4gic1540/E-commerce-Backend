import { Module } from "@nestjs/common";
import { SupabaseModule } from "@app/shared";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";

@Module({
  imports: [SupabaseModule],
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService, CategoriesService],
})
export class ProductsModule {}
