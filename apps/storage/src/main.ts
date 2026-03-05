import { NestFactory } from "@nestjs/core";
import { Transport, MicroserviceOptions } from "@nestjs/microservices";
import { StorageModule } from "./storage.module";
import { SERVICE_PORTS } from "@app/shared";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    StorageModule,
    {
      transport: Transport.TCP,
      options: { host: process.env.BIND_HOST ?? "0.0.0.0", port: SERVICE_PORTS.STORAGE },
    },
  );
  await app.listen();
  console.log(`📁 Storage Service escuchando en TCP :${SERVICE_PORTS.STORAGE}`);
}
bootstrap();
