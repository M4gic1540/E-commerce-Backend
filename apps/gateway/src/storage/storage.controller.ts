import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Inject,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ClientProxy } from "@nestjs/microservices";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import { SERVICE_NAMES, STORAGE_PATTERNS } from "@app/shared";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { AdminGuard } from "../guards/admin.guard";

@ApiTags("Storage")
@Controller("storage")
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class StorageGatewayController {
  constructor(
    @Inject(SERVICE_NAMES.STORAGE) private storageClient: ClientProxy,
  ) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        folder: { type: "string", default: "images" },
      },
    },
  })
  @ApiOperation({ summary: "Subir una imagen" })
  uploadImage(
    @UploadedFile()
    file: { buffer: Buffer; originalname: string; mimetype: string },
    @Query("folder") folder?: string,
  ) {
    // Convertir Buffer a base64 para transmisión TCP (JSON)
    return firstValueFrom(
      this.storageClient.send(STORAGE_PATTERNS.UPLOAD, {
        file: {
          buffer: file.buffer.toString("base64"),
          originalname: file.originalname,
          mimetype: file.mimetype,
        },
        folder: folder || "images",
      }),
    );
  }

  @Delete(":path")
  @ApiOperation({ summary: "Eliminar una imagen" })
  deleteImage(@Param("path") path: string) {
    return firstValueFrom(
      this.storageClient.send(STORAGE_PATTERNS.DELETE, { path }),
    );
  }

  @Get()
  @ApiOperation({ summary: "Listar imágenes" })
  listImages(@Query("folder") folder?: string) {
    return firstValueFrom(
      this.storageClient.send(STORAGE_PATTERNS.LIST, {
        folder: folder || "images",
      }),
    );
  }
}
