import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom, timeout, catchError } from "rxjs";
import { SERVICE_NAMES, AUTH_PATTERNS } from "@app/shared";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(SERVICE_NAMES.AUTH) private authClient: ClientProxy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token de acceso no proporcionado");
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      const user = await firstValueFrom(
        this.authClient.send(AUTH_PATTERNS.VALIDATE_TOKEN, { token }).pipe(
          timeout(5000),
          catchError((err) => {
            throw new UnauthorizedException(
              err?.message || "Token inválido o expirado",
            );
          }),
        ),
      );

      request.user = user;
      request.accessToken = token;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Error al validar el token");
    }
  }
}
