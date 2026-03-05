# Comunicación entre Microservicios

## Mecanismo de Transporte

Toda la comunicación interna usa **NestJS TCP (JSON-RPC)**:
- El gateway actúa como **cliente TCP** usando `ClientProxy.send(pattern, payload)` → devuelve `Observable<T>` (RPC con respuesta).
- Los microservicios actúan como **servidores TCP** usando `@MessagePattern(pattern)`.
- No hay Redis, RabbitMQ ni HTTP inter-servicio.

---

## Diagrama Completo de Comunicación

```mermaid
graph LR
    subgraph GATEWAY["API Gateway :3000"]
        G_AUTH["AuthController\n/api/auth"]
        G_PROD["ProductsController\n/api/products"]
        G_CAT["CategoriesController\n/api/categories"]
        G_ORD["OrdersController\n/api/orders"]
        G_CUS["CustomersController\n/api/customers"]
        G_CART["CartController\n/api/cart"]
        G_ANA["AnalyticsController\n/api/analytics"]
        G_STO["StorageController\n/api/storage"]
    end

    subgraph AUTH_SVC["auth :3001"]
        A1["auth.register"]
        A2["auth.login"]
        A3["auth.refresh"]
        A4["auth.logout"]
        A5["auth.profile"]
        A6["auth.validate_token"]
    end

    subgraph PROD_SVC["products :3002"]
        P1["products.findAll"]
        P2["products.findOne"]
        P3["products.findFeatured"]
        P4["products.create"]
        P5["products.update"]
        P6["products.remove"]
        P7["products.restore"]
        C1["categories.findAll"]
        C2["categories.findOne"]
        C3["categories.create"]
        C4["categories.update"]
        C5["categories.remove"]
        C6["categories.restore"]
    end

    subgraph ORD_SVC["orders :3003"]
        O1["orders.findAll"]
        O2["orders.findOne"]
        O3["orders.findByCustomer"]
        O4["orders.create"]
        O5["orders.updateStatus"]
        O6["orders.cancel"]
        O7["orders.generateReceipt"]
        O8["orders.getReceipt"]
    end

    subgraph CUS_SVC["customers :3004"]
        CU1["customers.findAll"]
        CU2["customers.findOne"]
        CU3["customers.getStats"]
        CU4["customers.update"]
    end

    subgraph CART_SVC["cart :3005"]
        CA1["cart.getCart"]
        CA2["cart.addItem"]
        CA3["cart.updateQuantity"]
        CA4["cart.removeItem"]
        CA5["cart.clearCart"]
    end

    subgraph ANA_SVC["analytics :3006"]
        AN1["analytics.dashboard"]
    end

    subgraph STO_SVC["storage :3007"]
        S1["storage.upload"]
        S2["storage.delete"]
        S3["storage.list"]
    end

    G_AUTH -- TCP --> AUTH_SVC
    G_PROD -- TCP --> PROD_SVC
    G_CAT  -- TCP --> PROD_SVC
    G_ORD  -- TCP --> ORD_SVC
    G_CUS  -- TCP --> CUS_SVC
    G_CART -- TCP --> CART_SVC
    G_ANA  -- TCP --> ANA_SVC
    G_STO  -- TCP --> STO_SVC

    style GATEWAY fill:#4f46e5,color:#fff
    style AUTH_SVC fill:#0891b2,color:#fff
    style PROD_SVC fill:#0891b2,color:#fff
    style ORD_SVC fill:#0891b2,color:#fff
    style CUS_SVC fill:#0891b2,color:#fff
    style CART_SVC fill:#0891b2,color:#fff
    style ANA_SVC fill:#0891b2,color:#fff
    style STO_SVC fill:#0891b2,color:#fff
```

---

## Referencia de Message Patterns

### AUTH_SERVICE — `auth :3001`

| Pattern | Payload | Respuesta | Guard en Gateway |
|---|---|---|---|
| `auth.register` | `{ name, email, password }` | `{ access_token, refresh_token, user }` | Público |
| `auth.login` | `{ email, password }` | `{ access_token, refresh_token, user }` | Público |
| `auth.refresh` | `{ refresh_token }` | `{ access_token, refresh_token }` | Público |
| `auth.logout` | `{ accessToken }` | `{ message }` | JwtAuthGuard |
| `auth.profile` | `{ userId }` | `Customer` | JwtAuthGuard |
| `auth.validate_token` | `{ token }` | `{ id, email, role }` | Usado internamente por Guards |

### PRODUCTS_SERVICE — `products :3002`

| Pattern | Payload | Respuesta | Guard |
|---|---|---|---|
| `products.findAll` | `QueryProductDto` | `PaginatedResult<Product>` | Público |
| `products.findOne` | `{ id: string }` | `Product` | Público |
| `products.findFeatured` | `{}` | `Product[]` | Público |
| `products.create` | `CreateProductDto` | `Product` | AdminGuard |
| `products.update` | `{ id, dto: UpdateProductDto }` | `Product` | AdminGuard |
| `products.remove` | `{ id: string }` | `{ message }` | AdminGuard |
| `products.restore` | `{ id: string }` | `Product` | AdminGuard |
| `categories.findAll` | `{}` | `Category[]` | Público |
| `categories.findOne` | `{ id: string }` | `Category` | Público |
| `categories.create` | `CreateCategoryDto` | `Category` | AdminGuard |
| `categories.update` | `{ id, dto: UpdateCategoryDto }` | `Category` | AdminGuard |
| `categories.remove` | `{ id: string }` | `{ message }` | AdminGuard |
| `categories.restore` | `{ id: string }` | `Category` | AdminGuard |

### ORDERS_SERVICE — `orders :3003`

| Pattern | Payload | Respuesta | Guard |
|---|---|---|---|
| `orders.findAll` | `QueryOrderDto` | `PaginatedResult<Order>` | AdminGuard |
| `orders.findOne` | `{ id: string }` | `Order` | JwtAuthGuard |
| `orders.findByCustomer` | `{ customerId, query: PaginationDto }` | `PaginatedResult<Order>` | JwtAuthGuard |
| `orders.create` | `{ userId, dto: CreateOrderDto }` | `Order` | JwtAuthGuard |
| `orders.updateStatus` | `{ id, dto: UpdateOrderStatusDto }` | `Order` | AdminGuard |
| `orders.cancel` | `{ id: string }` | `Order` | JwtAuthGuard |
| `orders.generateReceipt` | `{ id: string }` | `{ receipt_url }` | AdminGuard |
| `orders.getReceipt` | `{ id: string }` | `{ receipt_url }` | JwtAuthGuard |

### CUSTOMERS_SERVICE — `customers :3004`

| Pattern | Payload | Respuesta | Guard |
|---|---|---|---|
| `customers.findAll` | `QueryCustomerDto` | `PaginatedResult<Customer>` | AdminGuard |
| `customers.findOne` | `{ id: string }` | `Customer` | JwtAuthGuard |
| `customers.getStats` | `{ id: string }` | `CustomerStats` | JwtAuthGuard |
| `customers.update` | `{ id, dto: { name?, phone?, avatar? } }` | `Customer` | JwtAuthGuard |

### CART_SERVICE — `cart :3005`

| Pattern | Payload | Respuesta | Guard |
|---|---|---|---|
| `cart.getCart` | `{ customerId: string }` | `{ items, total, itemCount }` | JwtAuthGuard |
| `cart.addItem` | `{ customerId, dto: AddToCartDto }` | `CartItem` | JwtAuthGuard |
| `cart.updateQuantity` | `{ customerId, itemId, quantity }` | `CartItem` | JwtAuthGuard |
| `cart.removeItem` | `{ customerId, itemId }` | `{ message }` | JwtAuthGuard |
| `cart.clearCart` | `{ customerId: string }` | `{ message }` | JwtAuthGuard |

### ANALYTICS_SERVICE — `analytics :3006`

| Pattern | Payload | Respuesta | Guard |
|---|---|---|---|
| `analytics.dashboard` | `{}` | `DashboardStats` | AdminGuard |

### STORAGE_SERVICE — `storage :3007`

| Pattern | Payload | Respuesta | Guard |
|---|---|---|---|
| `storage.upload` | `{ file: { buffer: base64, originalname, mimetype }, folder }` | `{ url, path }` | AdminGuard |
| `storage.delete` | `{ path: string }` | `{ message }` | AdminGuard |
| `storage.list` | `{ folder: string }` | `FileObject[]` | AdminGuard |

> **Nota sobre Storage**: El `Buffer` del archivo se convierte a **base64** antes de enviarse por TCP porque JSON no soporta datos binarios directamente. El microservicio storage lo decodifica de vuelta a `Buffer` antes de subir a Supabase.

---

## Diagrama Visual Interactivo (Excalidraw)

Para visualizar la arquitectura de forma interactiva:

1. Abre el archivo [`architecture.excalidraw`](./architecture.excalidraw) con la extensión **Excalidraw** de VS Code, o
2. Ve a [excalidraw.com](https://excalidraw.com) → **Open** → selecciona el archivo `architecture.excalidraw`

El diagrama incluye:
- Layout visual de todos los servicios con colores por capa
- Flechas TCP etiquetadas con puertos
- Agrupación por dominio funcional
- Conexiones a Supabase (DB, Auth, Storage)
