import { Controller, Get, UseGuards, Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import { SERVICE_NAMES, ANALYTICS_PATTERNS } from "@app/shared";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { AdminGuard } from "../guards/admin.guard";

@ApiTags("Analytics")
@Controller("analytics")
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AnalyticsGatewayController {
  constructor(
    @Inject(SERVICE_NAMES.ANALYTICS) private analyticsClient: ClientProxy,
  ) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Obtener datos del dashboard analítico" })
  getDashboard() {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.DASHBOARD, {}),
    );
  }
}
