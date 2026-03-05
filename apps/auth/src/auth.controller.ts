import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_PATTERNS } from "@app/shared";
import { AuthService } from "./auth.service";

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @MessagePattern(AUTH_PATTERNS.REGISTER)
  register(@Payload() data: { name: string; email: string; password: string }) {
    return this.authService.register(data);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() data: { email: string; password: string }) {
    return this.authService.login(data);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  refresh(@Payload() data: { refresh_token: string }) {
    return this.authService.refreshToken(data.refresh_token);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  logout(@Payload() data: { accessToken: string }) {
    return this.authService.logout(data.accessToken);
  }

  @MessagePattern(AUTH_PATTERNS.PROFILE)
  getProfile(@Payload() data: { userId: string }) {
    return this.authService.getProfile(data.userId);
  }

  @MessagePattern(AUTH_PATTERNS.VALIDATE_TOKEN)
  validateToken(@Payload() data: { token: string }) {
    return this.authService.validateToken(data.token);
  }

  @MessagePattern(AUTH_PATTERNS.GET_ROLE)
  getRole(@Payload() data: { userId: string }) {
    return this.authService.getRole(data.userId);
  }
}
