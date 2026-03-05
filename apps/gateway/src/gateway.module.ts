import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { SERVICE_NAMES, SERVICE_PORTS } from "@app/shared";

import { AuthGatewayController } from "./auth/auth.controller";
import { ProductsGatewayController } from "./products/products.controller";
import { CategoriesGatewayController } from "./categories/categories.controller";
import { OrdersGatewayController } from "./orders/orders.controller";
import { CustomersGatewayController } from "./customers/customers.controller";
import { CartGatewayController } from "./cart/cart.controller";
import { AnalyticsGatewayController } from "./analytics/analytics.controller";
import { StorageGatewayController } from "./storage/storage.controller";
import { HealthController } from "./health.controller";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AdminGuard } from "./guards/admin.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    ClientsModule.register([
      {
        name: SERVICE_NAMES.AUTH,
        transport: Transport.TCP,
        options: { host: process.env.AUTH_SERVICE_HOST ?? "127.0.0.1", port: SERVICE_PORTS.AUTH },
      },
      {
        name: SERVICE_NAMES.PRODUCTS,
        transport: Transport.TCP,
        options: { host: process.env.PRODUCTS_SERVICE_HOST ?? "127.0.0.1", port: SERVICE_PORTS.PRODUCTS },
      },
      {
        name: SERVICE_NAMES.ORDERS,
        transport: Transport.TCP,
        options: { host: process.env.ORDERS_SERVICE_HOST ?? "127.0.0.1", port: SERVICE_PORTS.ORDERS },
      },
      {
        name: SERVICE_NAMES.CUSTOMERS,
        transport: Transport.TCP,
        options: { host: process.env.CUSTOMERS_SERVICE_HOST ?? "127.0.0.1", port: SERVICE_PORTS.CUSTOMERS },
      },
      {
        name: SERVICE_NAMES.CART,
        transport: Transport.TCP,
        options: { host: process.env.CART_SERVICE_HOST ?? "127.0.0.1", port: SERVICE_PORTS.CART },
      },
      {
        name: SERVICE_NAMES.ANALYTICS,
        transport: Transport.TCP,
        options: { host: process.env.ANALYTICS_SERVICE_HOST ?? "127.0.0.1", port: SERVICE_PORTS.ANALYTICS },
      },
      {
        name: SERVICE_NAMES.STORAGE,
        transport: Transport.TCP,
        options: { host: process.env.STORAGE_SERVICE_HOST ?? "127.0.0.1", port: SERVICE_PORTS.STORAGE },
      },
    ]),
  ],
  controllers: [
    HealthController,
    AuthGatewayController,
    ProductsGatewayController,
    CategoriesGatewayController,
    OrdersGatewayController,
    CustomersGatewayController,
    CartGatewayController,
    AnalyticsGatewayController,
    StorageGatewayController,
  ],
  providers: [JwtAuthGuard, AdminGuard],
})
export class GatewayModule {}
