import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy } from "@nestjs/microservices";
import { of } from "rxjs";
import { StorageGatewayController } from "./storage.controller";
import { SERVICE_NAMES, STORAGE_PATTERNS } from "@app/shared";
import { AdminGuard } from "../guards/admin.guard";

describe("StorageGatewayController", () => {
  let controller: StorageGatewayController;
  let storageClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageGatewayController],
      providers: [
        {
          provide: SERVICE_NAMES.STORAGE,
          useValue: { send: jest.fn() },
        },
        {
          provide: SERVICE_NAMES.AUTH,
          useValue: { send: jest.fn() },
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StorageGatewayController>(StorageGatewayController);
    storageClient = module.get(SERVICE_NAMES.STORAGE);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("uploadImage", () => {
    it("debe enviar imagen en base64 al servicio de storage", async () => {
      const expected = {
        path: "images/123.jpg",
        url: "https://url.com/img.jpg",
      };
      storageClient.send.mockReturnValue(of(expected));

      const file = {
        buffer: Buffer.from("fake-image"),
        originalname: "test.jpg",
        mimetype: "image/jpeg",
      };

      const result = await controller.uploadImage(file, "images");

      expect(result).toEqual(expected);
      const sendArgs = storageClient.send.mock.calls[0] as any[];
      expect(sendArgs[0]).toBe(STORAGE_PATTERNS.UPLOAD);
      expect(sendArgs[1].file.buffer).toBe(file.buffer.toString("base64"));
      expect(sendArgs[1].folder).toBe("images");
    });
  });

  describe("deleteImage", () => {
    it("debe solicitar eliminación de imagen", async () => {
      const expected = { message: "Imagen eliminada" };
      storageClient.send.mockReturnValue(of(expected));

      const result = await controller.deleteImage("images/123.jpg");
      expect(result).toEqual(expected);
      expect(storageClient.send).toHaveBeenCalledWith(STORAGE_PATTERNS.DELETE, {
        path: "images/123.jpg",
      });
    });
  });

  describe("listImages", () => {
    it("debe solicitar lista de imágenes", async () => {
      const expected = [{ name: "img.jpg", url: "url" }];
      storageClient.send.mockReturnValue(of(expected));

      const result = await controller.listImages("images");
      expect(result).toEqual(expected);
      expect(storageClient.send).toHaveBeenCalledWith(STORAGE_PATTERNS.LIST, {
        folder: "images",
      });
    });

    it('debe usar "images" como carpeta por defecto', async () => {
      storageClient.send.mockReturnValue(of([]));

      await controller.listImages(undefined);
      expect(storageClient.send).toHaveBeenCalledWith(STORAGE_PATTERNS.LIST, {
        folder: "images",
      });
    });
  });
});
