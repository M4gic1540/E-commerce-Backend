import { Module } from "@nestjs/common";
import { SupabaseModule } from "@app/shared";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

@Module({
  imports: [SupabaseModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
