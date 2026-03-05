import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { STORAGE_PATTERNS } from "@app/shared";
import { StorageService } from "./storage.service";

@Controller()
export class StorageController {
  constructor(private storageService: StorageService) {}

  @MessagePattern(STORAGE_PATTERNS.UPLOAD)
  upload(
    @Payload()
    data: {
      file: { buffer: string; originalname: string; mimetype: string };
      folder: string;
    },
  ) {
    // Buffer viene como base64 desde el gateway (TCP serializa JSON)
    const fileWithBuffer = {
      ...data.file,
      buffer: Buffer.from(data.file.buffer, "base64"),
    };
    return this.storageService.uploadImage(fileWithBuffer, data.folder);
  }

  @MessagePattern(STORAGE_PATTERNS.DELETE)
  delete(@Payload() data: { path: string }) {
    return this.storageService.deleteImage(data.path);
  }

  @MessagePattern(STORAGE_PATTERNS.LIST)
  list(@Payload() data: { folder: string }) {
    return this.storageService.listImages(data.folder);
  }
}
