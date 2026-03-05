import { NestFactory } from "@nestjs/core";
import { Transport, MicroserviceOptions } from "@nestjs/microservices";
import { AuthModule } from "./auth.module";
import { SERVICE_PORTS } from "@app/shared";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.BIND_HOST ?? "0.0.0.0",
        port: SERVICE_PORTS.AUTH,
      },
    },
  );

  await app.listen();
  console.log(`🔐 Auth Service escuchando en TCP :${SERVICE_PORTS.AUTH}`);
}
bootstrap();
