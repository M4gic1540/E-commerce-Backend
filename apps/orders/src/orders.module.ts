import { Module } from "@nestjs/common";
import { SupabaseModule } from "@app/shared";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { ReceiptService } from "./receipt.service";

@Module({
  imports: [SupabaseModule],
  controllers: [OrdersController],
  providers: [OrdersService, ReceiptService],
})
export class OrdersModule {}
