import { NestFactory } from "@nestjs/core";
import { Transport, MicroserviceOptions } from "@nestjs/microservices";
import { OrdersModule } from "./orders.module";
import { SERVICE_PORTS } from "@app/shared";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrdersModule,
    {
      transport: Transport.TCP,
      options: { host: process.env.BIND_HOST ?? "0.0.0.0", port: SERVICE_PORTS.ORDERS },
    },
  );
  await app.listen();
  console.log(`📋 Orders Service escuchando en TCP :${SERVICE_PORTS.ORDERS}`);
}
bootstrap();
