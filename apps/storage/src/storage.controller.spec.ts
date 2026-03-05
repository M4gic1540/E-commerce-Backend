import { Test, TestingModule } from "@nestjs/testing";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";

describe("StorageController", () => {
  let controller: StorageController;
  let service: jest.Mocked<StorageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: {
            uploadImage: jest.fn(),
            deleteImage: jest.fn(),
            listImages: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StorageController>(StorageController);
    service = module.get(StorageService);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("upload", () => {
    it("debe subir una imagen convirtiendo base64 a Buffer", async () => {
      const expected = {
        path: "images/123.jpg",
        url: "https://supabase.co/img.jpg",
      };
      service.uploadImage.mockResolvedValue(expected);

      const base64Buffer = Buffer.from("fake-data").toString("base64");
      const result = await controller.upload({
        file: {
          buffer: base64Buffer,
          originalname: "test.jpg",
          mimetype: "image/jpeg",
        },
        folder: "images",
      });

      expect(result).toEqual(expected);
      // Verificar que se convirtió de base64 a Buffer
      const callArg = service.uploadImage.mock.calls[0][0];
      expect(Buffer.isBuffer(callArg.buffer)).toBe(true);
    });
  });

  describe("delete", () => {
    it("debe eliminar una imagen", async () => {
      const expected = { message: "Imagen eliminada exitosamente" };
      service.deleteImage.mockResolvedValue(expected);

      const result = await controller.delete({ path: "images/123.jpg" });
      expect(result).toEqual(expected);
    });
  });

  describe("list", () => {
    it("debe listar imágenes", async () => {
      const expected = [
        {
          name: "img1.jpg",
          path: "images/img1.jpg",
          url: "url",
          created_at: "2024",
        },
      ];
      service.listImages.mockResolvedValue(expected);

      const result = await controller.list({ folder: "images" });
      expect(result).toEqual(expected);
    });
  });
});
