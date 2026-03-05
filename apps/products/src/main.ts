import { NestFactory } from "@nestjs/core";
import { Transport, MicroserviceOptions } from "@nestjs/microservices";
import { ProductsModule } from "./products.module";
import { SERVICE_PORTS } from "@app/shared";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ProductsModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.BIND_HOST ?? "0.0.0.0",
        port: SERVICE_PORTS.PRODUCTS,
      },
    },
  );

  await app.listen();
  console.log(
    `📦 Products Service escuchando en TCP :${SERVICE_PORTS.PRODUCTS}`,
  );
}
bootstrap();
