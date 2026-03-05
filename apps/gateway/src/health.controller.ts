import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Health")
@Controller()
export class HealthController {
  @Get("health")
  @ApiOperation({ summary: "Health check del API Gateway" })
  health() {
    return {
      status: "ok",
      service: "api-gateway",
      timestamp: new Date().toISOString(),
    };
  }
}
