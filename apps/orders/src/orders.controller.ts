import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ORDERS_PATTERNS } from "@app/shared";
import { OrdersService } from "./orders.service";

@Controller()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @MessagePattern(ORDERS_PATTERNS.FIND_ALL)
  findAll(@Payload() query: any) {
    return this.ordersService.findAll(query);
  }

  @MessagePattern(ORDERS_PATTERNS.FIND_ONE)
  findOne(@Payload() data: { id: string }) {
    return this.ordersService.findOne(data.id);
  }

  @MessagePattern(ORDERS_PATTERNS.FIND_BY_CUSTOMER)
  findByCustomer(@Payload() data: { customerId: string; query: any }) {
    return this.ordersService.findByCustomer(data.customerId, data.query);
  }

  @MessagePattern(ORDERS_PATTERNS.CREATE)
  create(@Payload() data: { userId: string; dto: any }) {
    return this.ordersService.create(data.userId, data.dto);
  }

  @MessagePattern(ORDERS_PATTERNS.UPDATE_STATUS)
  updateStatus(@Payload() data: { id: string; dto: any }) {
    return this.ordersService.updateStatus(data.id, data.dto);
  }

  @MessagePattern(ORDERS_PATTERNS.CANCEL)
  cancel(@Payload() data: { id: string }) {
    return this.ordersService.cancel(data.id);
  }

  @MessagePattern(ORDERS_PATTERNS.GENERATE_RECEIPT)
  generateReceipt(@Payload() data: { id: string }) {
    return this.ordersService.generateReceipt(data.id);
  }

  @MessagePattern(ORDERS_PATTERNS.GET_RECEIPT)
  getReceipt(@Payload() data: { id: string }) {
    return this.ordersService.getReceipt(data.id);
  }
}
