import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwtAuthGuard: JwtAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Primero validar el JWT
    const isAuthenticated = await this.jwtAuthGuard.canActivate(context);
    if (!isAuthenticated) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== "admin") {
      throw new ForbiddenException(
        "Acceso denegado: se requieren permisos de administrador",
      );
    }

    return true;
  }
}
