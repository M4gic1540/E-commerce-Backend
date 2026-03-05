import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { SupabaseService } from "@app/shared";

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  async register(dto: { name: string; email: string; password: string }) {
    const admin = this.supabaseService.getAdminClient();

    const { data: userData, error: createError } =
      await admin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: { name: dto.name },
      });

    if (createError) {
      throw new RpcException({ statusCode: 400, message: createError.message });
    }

    await admin.from("customers").insert({
      id: userData.user.id,
      name: dto.name,
      email: dto.email,
    });

    const client = this.supabaseService.getClient();
    const { data: loginData } = await client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    return {
      message: "Usuario registrado exitosamente",
      user: {
        id: userData.user.id,
        email: userData.user.email,
        name: dto.name,
      },
      session: loginData?.session
        ? {
            access_token: loginData.session.access_token,
            refresh_token: loginData.session.refresh_token,
            expires_at: loginData.session.expires_at,
          }
        : null,
    };
  }

  async login(dto: { email: string; password: string }) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new RpcException({
        statusCode: 401,
        message: "Credenciales inválidas",
      });
    }

    // Obtener rol del usuario desde customers
    const admin = this.supabaseService.getAdminClient();
    const { data: customer } = await admin
      .from("customers")
      .select("role")
      .eq("id", data.user.id)
      .single();

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        role: customer?.role || "customer",
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new RpcException({
        statusCode: 401,
        message: "Token de refresco inválido",
      });
    }

    return {
      session: {
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        expires_at: data.session!.expires_at,
      },
    };
  }

  async logout(accessToken: string) {
    const client = this.supabaseService.getClientWithAuth(accessToken);
    await client.auth.signOut();
    return { message: "Sesión cerrada exitosamente" };
  }

  async getProfile(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from("customers")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      throw new RpcException({
        statusCode: 400,
        message: "Perfil no encontrado",
      });
    }

    return data;
  }

  async validateToken(token: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      throw new RpcException({
        statusCode: 401,
        message: "Token inválido o expirado",
      });
    }

    // Incluir rol del usuario
    const admin = this.supabaseService.getAdminClient();
    const { data: customer } = await admin
      .from("customers")
      .select("role")
      .eq("id", data.user.id)
      .single();

    return {
      ...data.user,
      role: customer?.role || "customer",
    };
  }

  async getRole(userId: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from("customers")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      throw new RpcException({
        statusCode: 400,
        message: "Usuario no encontrado",
      });
    }

    return data.role || "customer";
  }
}
