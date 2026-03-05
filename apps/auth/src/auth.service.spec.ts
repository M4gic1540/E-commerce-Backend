import { Test, TestingModule } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { AuthService } from "./auth.service";
import { SupabaseService } from "@app/shared";

describe("AuthService", () => {
  let service: AuthService;
  let supabaseService: jest.Mocked<any>;

  const mockClient = {
    auth: {
      signInWithPassword: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
    },
  };

  const mockAdminClient = {
    auth: {
      admin: {
        createUser: jest.fn(),
      },
    },
    from: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockClient),
            getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
            getClientWithAuth: jest.fn().mockReturnValue(mockClient),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    supabaseService = module.get(SupabaseService);
  });

  it("debe estar definido", () => {
    expect(service).toBeDefined();
  });

  // ─── REGISTER ──────────────────────────────────────────
  describe("register", () => {
    const registerDto = {
      name: "Juan",
      email: "juan@test.com",
      password: "password123",
    };

    it("debe registrar un usuario exitosamente", async () => {
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "user-id", email: "juan@test.com" } },
        error: null,
      });

      mockAdminClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: "token-123",
            refresh_token: "refresh-123",
            expires_at: 99999,
          },
        },
        error: null,
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty(
        "message",
        "Usuario registrado exitosamente",
      );
      expect(result.user).toEqual({
        id: "user-id",
        email: "juan@test.com",
        name: "Juan",
      });
      expect(result.session).toEqual({
        access_token: "token-123",
        refresh_token: "refresh-123",
        expires_at: 99999,
      });
      expect(mockAdminClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: "juan@test.com",
        password: "password123",
        email_confirm: true,
        user_metadata: { name: "Juan" },
      });
    });

    it("debe lanzar RpcException si createUser falla", async () => {
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: "Email ya registrado" },
      });

      await expect(service.register(registerDto)).rejects.toThrow(RpcException);
    });

    it("debe retornar session null si el auto-login falla", async () => {
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "user-id", email: "juan@test.com" } },
        error: null,
      });

      mockAdminClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await service.register(registerDto);
      expect(result.session).toBeNull();
    });
  });

  // ─── LOGIN ─────────────────────────────────────────────
  describe("login", () => {
    const loginDto = { email: "juan@test.com", password: "password123" };

    it("debe hacer login exitosamente", async () => {
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: "user-id",
            email: "juan@test.com",
            user_metadata: { name: "Juan" },
          },
          session: {
            access_token: "token-123",
            refresh_token: "refresh-123",
            expires_at: 99999,
          },
        },
        error: null,
      });

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.login(loginDto);

      expect(result.user).toEqual({
        id: "user-id",
        email: "juan@test.com",
        name: "Juan",
        role: "customer",
      });
      expect(result.session.access_token).toBe("token-123");
    });

    it("debe lanzar RpcException con credenciales inválidas", async () => {
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: "Invalid credentials" },
      });

      await expect(service.login(loginDto)).rejects.toThrow(RpcException);
    });
  });

  // ─── REFRESH TOKEN ─────────────────────────────────────
  describe("refreshToken", () => {
    it("debe refrescar el token exitosamente", async () => {
      mockClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: "new-token",
            refresh_token: "new-refresh",
            expires_at: 99999,
          },
        },
        error: null,
      });

      const result = await service.refreshToken("old-refresh-token");

      expect(result.session.access_token).toBe("new-token");
      expect(result.session.refresh_token).toBe("new-refresh");
    });

    it("debe lanzar RpcException con refresh token inválido", async () => {
      mockClient.auth.refreshSession.mockResolvedValue({
        data: null,
        error: { message: "Invalid refresh token" },
      });

      await expect(service.refreshToken("bad-token")).rejects.toThrow(
        RpcException,
      );
    });
  });

  // ─── LOGOUT ─────────────────────────────────────────────
  describe("logout", () => {
    it("debe cerrar sesión exitosamente", async () => {
      mockClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await service.logout("access-token");

      expect(result).toEqual({ message: "Sesión cerrada exitosamente" });
      expect(supabaseService.getClientWithAuth).toHaveBeenCalledWith(
        "access-token",
      );
    });
  });

  // ─── GET PROFILE ────────────────────────────────────────
  describe("getProfile", () => {
    it("debe obtener el perfil del usuario", async () => {
      const mockProfile = {
        id: "user-id",
        name: "Juan",
        email: "juan@test.com",
      };
      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      });

      const result = await service.getProfile("user-id");
      expect(result).toEqual(mockProfile);
    });

    it("debe lanzar RpcException si el perfil no existe", async () => {
      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({
                data: null,
                error: { message: "Not found" },
              }),
          }),
        }),
      });

      await expect(service.getProfile("bad-id")).rejects.toThrow(RpcException);
    });
  });

  // ─── VALIDATE TOKEN ─────────────────────────────────────
  describe("validateToken", () => {
    it("debe validar un token correctamente", async () => {
      const mockUser = { id: "user-id", email: "juan@test.com" };
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.validateToken("valid-token");
      expect(result).toEqual({ ...mockUser, role: "customer" });
    });

    it("debe lanzar RpcException con token inválido", async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      await expect(service.validateToken("bad-token")).rejects.toThrow(
        RpcException,
      );
    });
  });
});
