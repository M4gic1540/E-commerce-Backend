import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CUSTOMERS_PATTERNS } from "@app/shared";
import { CustomersService } from "./customers.service";

@Controller()
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @MessagePattern(CUSTOMERS_PATTERNS.FIND_ALL)
  findAll(@Payload() query: any) {
    return this.customersService.findAll(query);
  }

  @MessagePattern(CUSTOMERS_PATTERNS.FIND_ONE)
  findOne(@Payload() data: { id: string }) {
    return this.customersService.findOne(data.id);
  }

  @MessagePattern(CUSTOMERS_PATTERNS.GET_STATS)
  getStats(@Payload() data: { id: string }) {
    return this.customersService.getStats(data.id);
  }

  @MessagePattern(CUSTOMERS_PATTERNS.UPDATE)
  update(@Payload() data: { id: string; dto: any }) {
    return this.customersService.update(data.id, data.dto);
  }
}
