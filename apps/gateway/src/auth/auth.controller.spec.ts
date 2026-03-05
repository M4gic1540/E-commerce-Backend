import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy } from "@nestjs/microservices";
import { of } from "rxjs";
import { AuthGatewayController } from "./auth.controller";
import { SERVICE_NAMES, AUTH_PATTERNS } from "@app/shared";

describe("AuthGatewayController", () => {
  let controller: AuthGatewayController;
  let authClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthGatewayController],
      providers: [
        {
          provide: SERVICE_NAMES.AUTH,
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthGatewayController>(AuthGatewayController);
    authClient = module.get(SERVICE_NAMES.AUTH);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("register", () => {
    it("debe enviar mensaje de registro al servicio de auth", async () => {
      const dto = {
        name: "Juan",
        email: "juan@test.com",
        password: "pass123",
      } as any;
      const expected = { message: "ok", user: { id: "1" } };
      authClient.send.mockReturnValue(of(expected));

      const result = await controller.register(dto);
      expect(result).toEqual(expected);
      expect(authClient.send).toHaveBeenCalledWith(AUTH_PATTERNS.REGISTER, dto);
    });
  });

  describe("login", () => {
    it("debe enviar credenciales al servicio de auth", async () => {
      const dto = { email: "juan@test.com", password: "pass123" } as any;
      const expected = { user: { id: "1" }, session: { access_token: "tok" } };
      authClient.send.mockReturnValue(of(expected));

      const result = await controller.login(dto);
      expect(result).toEqual(expected);
      expect(authClient.send).toHaveBeenCalledWith(AUTH_PATTERNS.LOGIN, dto);
    });
  });

  describe("refresh", () => {
    it("debe enviar el refresh token", async () => {
      const expected = { session: { access_token: "new" } };
      authClient.send.mockReturnValue(of(expected));

      const result = await controller.refresh("rt-123");
      expect(result).toEqual(expected);
      expect(authClient.send).toHaveBeenCalledWith(AUTH_PATTERNS.REFRESH, {
        refresh_token: "rt-123",
      });
    });
  });

  describe("logout", () => {
    it("debe enviar token de acceso para logout", async () => {
      const req = { accessToken: "tok-123" };
      const expected = { message: "Sesión cerrada" };
      authClient.send.mockReturnValue(of(expected));

      const result = await controller.logout(req);
      expect(result).toEqual(expected);
      expect(authClient.send).toHaveBeenCalledWith(AUTH_PATTERNS.LOGOUT, {
        accessToken: "tok-123",
      });
    });
  });

  describe("getProfile", () => {
    it("debe obtener perfil por userId", async () => {
      const req = { user: { id: "user-1" } };
      const expected = { id: "user-1", name: "Juan" };
      authClient.send.mockReturnValue(of(expected));

      const result = await controller.getProfile(req);
      expect(result).toEqual(expected);
      expect(authClient.send).toHaveBeenCalledWith(AUTH_PATTERNS.PROFILE, {
        userId: "user-1",
      });
    });
  });
});
