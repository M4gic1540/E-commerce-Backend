import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            getProfile: jest.fn(),
            validateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("register", () => {
    it("debe llamar a authService.register con los datos correctos", async () => {
      const dto = {
        name: "Juan",
        email: "juan@test.com",
        password: "password123",
      };
      const expected = {
        message: "Usuario registrado exitosamente",
        user: { id: "1", email: "juan@test.com", name: "Juan" },
        session: null,
      };
      authService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);
      expect(result).toEqual(expected);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe("login", () => {
    it("debe llamar a authService.login con las credenciales", async () => {
      const dto = { email: "juan@test.com", password: "password123" };
      const expected = { user: { id: "1" }, session: { access_token: "tok" } };
      authService.login.mockResolvedValue(expected as any);

      const result = await controller.login(dto);
      expect(result).toEqual(expected);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe("refresh", () => {
    it("debe llamar a authService.refreshToken", async () => {
      const expected = { session: { access_token: "new" } };
      authService.refreshToken.mockResolvedValue(expected as any);

      const result = await controller.refresh({ refresh_token: "rt-123" });
      expect(result).toEqual(expected);
      expect(authService.refreshToken).toHaveBeenCalledWith("rt-123");
    });
  });

  describe("logout", () => {
    it("debe llamar a authService.logout con el accessToken", async () => {
      const expected = { message: "Sesión cerrada exitosamente" };
      authService.logout.mockResolvedValue(expected);

      const result = await controller.logout({ accessToken: "token-123" });
      expect(result).toEqual(expected);
      expect(authService.logout).toHaveBeenCalledWith("token-123");
    });
  });

  describe("getProfile", () => {
    it("debe llamar a authService.getProfile con userId", async () => {
      const profile = { id: "user-1", name: "Juan", email: "juan@test.com" };
      authService.getProfile.mockResolvedValue(profile);

      const result = await controller.getProfile({ userId: "user-1" });
      expect(result).toEqual(profile);
      expect(authService.getProfile).toHaveBeenCalledWith("user-1");
    });
  });

  describe("validateToken", () => {
    it("debe llamar a authService.validateToken", async () => {
      const user = { id: "user-1", email: "juan@test.com" } as any;
      authService.validateToken.mockResolvedValue(user);

      const result = await controller.validateToken({ token: "valid-token" });
      expect(result).toEqual(user);
      expect(authService.validateToken).toHaveBeenCalledWith("valid-token");
    });
  });
});
