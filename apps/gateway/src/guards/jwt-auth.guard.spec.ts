import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { SERVICE_NAMES, AUTH_PATTERNS } from "@app/shared";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let authClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: SERVICE_NAMES.AUTH,
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    authClient = module.get(SERVICE_NAMES.AUTH);
  });

  const createMockContext = (authHeader?: string) => {
    const request: any = {
      headers: {
        authorization: authHeader,
      },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      request,
    } as any;
  };

  it("debe estar definido", () => {
    expect(guard).toBeDefined();
  });

  it("debe lanzar UnauthorizedException si no hay header Authorization", async () => {
    const context = createMockContext(undefined);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("debe lanzar UnauthorizedException si el header no empieza con Bearer", async () => {
    const context = createMockContext("Basic some-token");
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("debe validar el token y setear user en el request", async () => {
    const mockUser = { id: "user-1", email: "test@test.com" };
    authClient.send.mockReturnValue(of(mockUser));

    const context = createMockContext("Bearer valid-token");
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(authClient.send).toHaveBeenCalledWith(AUTH_PATTERNS.VALIDATE_TOKEN, {
      token: "valid-token",
    });
    expect(context.request.user).toEqual(mockUser);
    expect(context.request.accessToken).toBe("valid-token");
  });

  it("debe lanzar UnauthorizedException si el token es inválido", async () => {
    authClient.send.mockReturnValue(
      throwError(() => new Error("Token inválido")),
    );

    const context = createMockContext("Bearer invalid-token");
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
