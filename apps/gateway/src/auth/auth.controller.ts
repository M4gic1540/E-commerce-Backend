import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Inject,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  SERVICE_NAMES,
  AUTH_PATTERNS,
  RegisterDto,
  LoginDto,
} from "@app/shared";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

@ApiTags("Auth")
@Controller("auth")
export class AuthGatewayController {
  constructor(@Inject(SERVICE_NAMES.AUTH) private authClient: ClientProxy) {}

  @Post("register")
  @ApiOperation({ summary: "Registrar nuevo usuario" })
  register(@Body() dto: RegisterDto) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.REGISTER, dto));
  }

  @Post("login")
  @ApiOperation({ summary: "Iniciar sesión" })
  login(@Body() dto: LoginDto) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.LOGIN, dto));
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refrescar token de acceso" })
  refresh(@Body("refresh_token") refreshToken: string) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.REFRESH, {
        refresh_token: refreshToken,
      }),
    );
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cerrar sesión" })
  logout(@Req() req: any) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.LOGOUT, {
        accessToken: req.accessToken,
      }),
    );
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener perfil del usuario autenticado" })
  getProfile(@Req() req: any) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.PROFILE, { userId: req.user.id }),
    );
  }
}
