# Diagramas de Secuencia UML

Estos diagramas muestran el flujo completo de las operaciones más importantes del sistema, desde la petición HTTP del cliente hasta la respuesta final, pasando por todos los microservicios involucrados.

---

## 1. Flujo de Autenticación (Login)

```mermaid
sequenceDiagram
    actor Cliente as 🌐 Cliente (React)
    participant GW as API Gateway :3000
    participant AUTH as auth :3001
    participant SUPA_AUTH as Supabase Auth

    Cliente->>+GW: POST /api/auth/login\n{ email, password }

    note over GW: ValidationPipe valida LoginDto\nTransactionInterceptor genera X-Transaction-Id

    GW->>+AUTH: TCP send("auth.login")\n{ email, password }

    AUTH->>+SUPA_AUTH: signInWithPassword({ email, password })
    SUPA_AUTH-->>-AUTH: { session: { access_token, refresh_token }, user }

    AUTH-->>-GW: { access_token, refresh_token, user }

    GW-->>-Cliente: 200 OK\n{ access_token, refresh_token, user }\nX-Transaction-Id: <uuid>
```

---

## 2. Flujo de Validación de Token (en cada request autenticado)

```mermaid
sequenceDiagram
    actor Cliente as 🌐 Cliente (React)
    participant GW as API Gateway :3000
    participant JWT as JwtAuthGuard
    participant AUTH as auth :3001
    participant TARGET as Microservicio destino

    Cliente->>+GW: GET /api/cart\nAuthorization: Bearer <token>

    GW->>+JWT: canActivate(context)
    JWT->>+AUTH: TCP send("auth.validate_token")\n{ token } — timeout 5s

    alt Token válido
        AUTH-->>JWT: { id, email, role }
        JWT-->>-GW: true — adjunta user al request
        GW->>+TARGET: TCP send(pattern, payload)
        TARGET-->>-GW: resultado
        GW-->>-Cliente: 200 OK + datos
    else Token inválido / expirado
        AUTH-->>JWT: error
        JWT-->>GW: false
        GW-->>Cliente: 401 Unauthorized
    end
```

---

## 3. Flujo de Creación de Orden (Checkout)

Este es el flujo más complejo: involucra validación de stock en products, creación en Supabase, generación de PDF con PDFKit y subida a Supabase Storage.

```mermaid
sequenceDiagram
    actor Cliente as 🌐 Cliente (React)
    participant GW as API Gateway :3000
    participant AUTH as auth :3001
    participant ORD as orders :3003
    participant DB as Supabase DB
    participant PDF as PDFKit (en orders)
    participant STO_S3 as Supabase Storage

    Cliente->>+GW: POST /api/orders\nAuthorization: Bearer <token>\n{ items, shipping_address,\n  shipping_method, payment_method }

    note over GW: JwtAuthGuard → valida token\nextrae userId del user autenticado

    GW->>+ORD: TCP send("orders.create")\n{ userId, dto: CreateOrderDto }

    ORD->>+DB: SELECT products WHERE id IN (items[].product_id)
    DB-->>-ORD: productos con precio y stock actual

    alt Stock insuficiente
        ORD-->>GW: RpcException("Insufficient stock for...")
        GW-->>Cliente: 400 Bad Request
    else Stock OK
        ORD->>DB: INSERT orders (status: "pending",\norder_number: "PED-XXXX", total, ...)
        ORD->>DB: INSERT order_items[] (snapshot precio/nombre)
        DB-->>ORD: orden creada con ID

        ORD->>+PDF: Genera PDF de boleta\n(PDFKit: datos del pedido, items, totales)
        PDF-->>-ORD: Buffer PDF

        ORD->>+STO_S3: Sube PDF al bucket "receipts/\nrecibo-{order_number}.pdf"
        STO_S3-->>-ORD: URL pública firmada

        ORD->>DB: UPDATE orders SET receipt_url = <url>
        DB-->>ORD: OK

        ORD-->>-GW: Order completa (con receipt_url)
        GW-->>-Cliente: 201 Created\n{ id, order_number, status, total,\n  items, receipt_url }
    end
```

---

## 4. Flujo de Carrito de Compras (Agregar Item)

```mermaid
sequenceDiagram
    actor Cliente as 🌐 Cliente (React)
    participant GW as API Gateway :3000
    participant CART as cart :3005
    participant DB as Supabase DB

    Cliente->>+GW: POST /api/cart/items\nAuthorization: Bearer <token>\n{ product_id, quantity }

    note over GW: JwtAuthGuard → extrae customerId del token

    GW->>+CART: TCP send("cart.addItem")\n{ customerId, dto: { product_id, quantity } }

    CART->>+DB: SELECT cart_items\nWHERE customer_id = X\nAND product_id = Y\nAND deleted_at IS NULL

    alt Item ya existe en el carrito
        DB-->>CART: CartItem existente
        CART->>DB: UPDATE cart_items\nSET quantity = existing + new
        DB-->>-CART: CartItem actualizado
    else Item nuevo
        CART->>DB: INSERT cart_items\n{ customer_id, product_id, quantity }
        DB-->>-CART: CartItem creado
    end

    CART-->>-GW: CartItem (con datos del producto)
    GW-->>-Cliente: 201 Created\n{ id, product_id, quantity, product: {...} }
```

---

## 5. Flujo de Subida de Imagen (Storage)

Este flujo incluye la serialización especial del `Buffer` binario a **base64** para el transporte TCP.

```mermaid
sequenceDiagram
    actor Admin as 👤 Admin
    participant GW as API Gateway :3000
    participant GW_CTRL as StorageController (Gateway)
    participant STO as storage :3007
    participant SUPA_S3 as Supabase Storage S3

    Admin->>+GW: POST /api/storage/upload\nAuthorization: Bearer <admin-token>\nContent-Type: multipart/form-data\n{ file: <binario>, folder: "images" }

    note over GW: AdminGuard → valida token + role === "admin"\nMulterInterceptor parsea el multipart

    GW->>+GW_CTRL: @UseInterceptors(FileInterceptor)\nextrae req.file (Buffer)

    note over GW_CTRL: Serialización TCP:\nfile.buffer.toString("base64")\n→ JSON-safe para transporte

    GW_CTRL->>+STO: TCP send("storage.upload")\n{ file: { buffer: base64String,\n  originalname, mimetype },\n  folder: "images" }

    note over STO: Deserialización:\nBuffer.from(base64, "base64")\n→ Buffer binario original

    STO->>+SUPA_S3: storage.from(folder).upload(path, buffer,\n{ contentType: mimetype })
    SUPA_S3-->>-STO: { data: { path }, error: null }

    STO->>SUPA_S3: getPublicUrl(path)
    SUPA_S3-->>STO: { data: { publicUrl } }

    STO-->>-GW_CTRL: { url: publicUrl, path }
    GW_CTRL-->>-GW: { url, path }
    GW-->>-Admin: 201 Created\n{ url: "https://...supabase.co/storage/v1/...",\n  path: "images/filename.jpg" }
```

---

## 6. Flujo de Dashboard de Analytics

```mermaid
sequenceDiagram
    actor Admin as 👤 Admin
    participant GW as API Gateway :3000
    participant ANA as analytics :3006
    participant DB as Supabase DB

    Admin->>+GW: GET /api/analytics/dashboard\nAuthorization: Bearer <admin-token>

    note over GW: AdminGuard → valida token + role === "admin"

    GW->>+ANA: TCP send("analytics.dashboard") {}

    par Consultas en paralelo
        ANA->>DB: COUNT orders por status
    and
        ANA->>DB: SUM total de órdenes por período
    and
        ANA->>DB: COUNT customers activos
    and
        ANA->>DB: TOP products por ventas
    and
        ANA->>DB: Ingresos por período (daily/weekly/monthly)
    end

    DB-->>ANA: Resultados agregados

    ANA-->>-GW: DashboardStats { revenue, orders,\n  customers, topProducts,\n  revenueChart, ordersChart }

    GW-->>-Admin: 200 OK\n{ revenue, orders, customers,\n  topProducts, revenueChart }
```
