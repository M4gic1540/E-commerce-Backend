import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { ANALYTICS_PATTERNS } from "@app/shared";
import { AnalyticsService } from "./analytics.service";

@Controller()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @MessagePattern(ANALYTICS_PATTERNS.DASHBOARD)
  getDashboard() {
    return this.analyticsService.getDashboard();
  }
}
