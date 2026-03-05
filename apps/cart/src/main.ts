import { NestFactory } from "@nestjs/core";
import { Transport, MicroserviceOptions } from "@nestjs/microservices";
import { CartModule } from "./cart.module";
import { SERVICE_PORTS } from "@app/shared";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CartModule,
    {
      transport: Transport.TCP,
      options: { host: process.env.BIND_HOST ?? "0.0.0.0", port: SERVICE_PORTS.CART },
    },
  );
  await app.listen();
  console.log(`🛒 Cart Service escuchando en TCP :${SERVICE_PORTS.CART}`);
}
bootstrap();
