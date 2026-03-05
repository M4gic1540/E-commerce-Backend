# E-Commerce Backend

API backend para plataforma de e-commerce construida con **NestJS** en arquitectura de **microservicios**, usando **Supabase** como base de datos y almacenamiento, y **Docker** para la orquestación de servicios.

---

## Arquitectura

El proyecto sigue un patrón de **API Gateway + Microservicios**. El gateway actúa como punto de entrada único y enruta las peticiones a cada microservicio correspondiente.

```
gateway (puerto 3000)
├── auth        → Autenticación y autorización (JWT / Supabase Auth)
├── products    → Catálogo de productos y categorías
├── cart        → Carrito de compras
├── orders      → Gestión de órdenes y recibos
├── customers   → Gestión de clientes
├── analytics   → Métricas y reportes
└── storage     → Subida y gestión de archivos (Supabase Storage)
```

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js     | 20.x          |
| pnpm        | 9.x           |
| Docker      | 24.x          |
| Docker Compose | v2         |

---

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase (admin) |
| `SUPABASE_DB_URL` | URL de conexión directa a PostgreSQL |
| `SUPABASE_S3_ENDPOINT` | Endpoint S3 compatible de Supabase Storage |
| `SUPABASE_S3_REGION` | Región del bucket S3 |
| `PORT` | Puerto del gateway (default: `3000`) |
| `NODE_ENV` | Entorno de ejecución (`development` / `production`) |
| `CORS_ORIGIN` | Origen permitido por CORS (ej: `http://localhost:5173`) |

---

## Instalación y ejecución

### Desarrollo local

```bash
# Instalar dependencias
pnpm install

# Iniciar todos los microservicios en modo desarrollo
node scripts/start-all-dev.js
```

### Con Docker Compose

```bash
# Levantar todos los servicios
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f

# Detener servicios
docker compose down
```

---

## Tests

```bash
# Tests unitarios
pnpm test

# Tests con cobertura
pnpm test:cov

# Tests e2e
node tests/e2e.test.mjs
```

---

## Base de datos / Migraciones

Los scripts de migración y seed se encuentran en la carpeta `supabase/`:

```bash
# Ejecutar migración principal
node supabase/run-migration.mjs

# Crear usuario administrador
node supabase/seed-admin.mjs
```

---

## Estructura del proyecto

```
apps/
├── gateway/        # API Gateway - punto de entrada HTTP
├── auth/           # Microservicio de autenticación
├── products/       # Microservicio de productos y categorías
├── cart/           # Microservicio de carrito
├── orders/         # Microservicio de órdenes
├── customers/      # Microservicio de clientes
├── analytics/      # Microservicio de analíticas
└── storage/        # Microservicio de almacenamiento
libs/
└── shared/         # Tipos, DTOs y utilidades compartidas
scripts/            # Scripts de inicio de microservicios
supabase/           # Migraciones y seeds de base de datos
tests/              # Tests e2e
```

---

## Licencia

MIT
