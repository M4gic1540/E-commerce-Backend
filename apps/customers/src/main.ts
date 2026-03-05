import { NestFactory } from "@nestjs/core";
import { Transport, MicroserviceOptions } from "@nestjs/microservices";
import { CustomersModule } from "./customers.module";
import { SERVICE_PORTS } from "@app/shared";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CustomersModule,
    {
      transport: Transport.TCP,
      options: { host: process.env.BIND_HOST ?? "0.0.0.0", port: SERVICE_PORTS.CUSTOMERS },
    },
  );
  await app.listen();
  console.log(
    `👥 Customers Service escuchando en TCP :${SERVICE_PORTS.CUSTOMERS}`,
  );
}
bootstrap();
