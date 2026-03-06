# ─── Etapa 1: Dependencias ────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Etapa 2: Build (compila todos los microservicios) ────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

# ─── Etapa 3: Runner (producción) ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

# Solo dependencias de producción
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Todos los binarios compilados
COPY --from=builder /app/dist ./dist

# Directorio de logs con permisos para el usuario sin privilegios
RUN mkdir -p /app/logs && addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app/logs
USER appuser

# El servicio a arrancar se determina en tiempo de ejecución vía startCommand
# definido en cada railway/<servicio>.toml (o variable SERVICE como fallback)
CMD node dist/apps/${SERVICE}/main.js
