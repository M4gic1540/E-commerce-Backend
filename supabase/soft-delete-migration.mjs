/**
 * Migración: Agregar soft delete (deleted_at) a todas las tablas
 * Uso: node supabase/soft-delete-migration.mjs
 */
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres:s0p0rt3s0p0rt@db.ldvxvhegcdxvqhsoiodd.supabase.co:5432/postgres';

const MIGRATION_SQL = `
-- =====================================================
-- SOFT DELETE: Agregar columna deleted_at a todas las tablas
-- =====================================================

-- 1. categories
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. products
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. customers
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 4. orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 5. order_items
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 6. cart_items
ALTER TABLE public.cart_items 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- =====================================================
-- Índices parciales para mejorar rendimiento en consultas
-- WHERE deleted_at IS NULL (registros activos)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_categories_active 
  ON public.categories (id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_active 
  ON public.products (id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_active 
  ON public.customers (id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_active 
  ON public.orders (id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_active 
  ON public.order_items (id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cart_items_active 
  ON public.cart_items (id) WHERE deleted_at IS NULL;

-- =====================================================
-- Actualizar RLS policies para excluir registros eliminados
-- (Las policies existentes se reemplazan)
-- =====================================================

-- Products: solo leer activos
DROP POLICY IF EXISTS "Lectura pública de productos" ON public.products;
CREATE POLICY "Lectura pública de productos" ON public.products
  FOR SELECT USING (deleted_at IS NULL);

-- Categories: solo leer activas
DROP POLICY IF EXISTS "Lectura pública de categorías" ON public.categories;
CREATE POLICY "Lectura pública de categorías" ON public.categories
  FOR SELECT USING (deleted_at IS NULL);

-- Orders: solo leer activas para el dueño
DROP POLICY IF EXISTS "Usuarios ven sus pedidos" ON public.orders;
CREATE POLICY "Usuarios ven sus pedidos" ON public.orders
  FOR SELECT USING (auth.uid() = customer_id AND deleted_at IS NULL);

-- Order items: solo leer activos
DROP POLICY IF EXISTS "Usuarios ven items de sus pedidos" ON public.order_items;
CREATE POLICY "Usuarios ven items de sus pedidos" ON public.order_items
  FOR SELECT USING (
    deleted_at IS NULL 
    AND EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
        AND orders.customer_id = auth.uid()
        AND orders.deleted_at IS NULL
    )
  );

-- Cart items: solo leer activos del usuario
DROP POLICY IF EXISTS "Usuarios manejan su carrito" ON public.cart_items;
CREATE POLICY "Usuarios manejan su carrito" ON public.cart_items
  FOR ALL USING (auth.uid() = customer_id AND deleted_at IS NULL);

-- Customers: leer su propio perfil activo
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON public.customers;
CREATE POLICY "Usuarios ven su propio perfil" ON public.customers
  FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Usuarios actualizan su perfil" ON public.customers;
CREATE POLICY "Usuarios actualizan su perfil" ON public.customers
  FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL);
`;

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    console.log('🔌 Conectando a Supabase...');
    await client.connect();

    console.log('🔄 Ejecutando migración de soft delete...');
    await client.query(MIGRATION_SQL);
    console.log('✅ Columnas deleted_at agregadas a todas las tablas');
    console.log('✅ Índices parciales creados');
    console.log('✅ Políticas RLS actualizadas');
    console.log('');
    console.log('🎉 ¡Migración de soft delete completada exitosamente!');
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
