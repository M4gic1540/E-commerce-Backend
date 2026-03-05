/**
 * Script para ejecutar la migración y seed en Supabase
 * Uso: node supabase/run-migration.mjs
 */
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres:s0p0rt3s0p0rt@db.ldvxvhegcdxvqhsoiodd.supabase.co:5432/postgres';

const MIGRATION_SQL = `
-- =====================================================
-- Extensiones necesarias
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- 1. TABLA: categories
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. TABLA: products
-- =====================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  original_price DECIMAL(10, 2),
  description TEXT,
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(2, 1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  variants JSONB,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. TABLA: customers (ligada a auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. TABLA: orders
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_address JSONB NOT NULL DEFAULT '{}',
  shipping_method VARCHAR(50) DEFAULT 'standard',
  payment_method VARCHAR(50) DEFAULT 'card',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. TABLA: order_items
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. TABLA: cart_items
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON public.products(rating);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_customer ON public.cart_items(customer_id);

-- =====================================================
-- FUNCIONES: updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS set_updated_at_categories ON public.categories;
CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_products ON public.products;
CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_customers ON public.customers;
CREATE TRIGGER set_updated_at_customers
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_orders ON public.orders;
CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- CATEGORIES: lectura pública, escritura con auth
DROP POLICY IF EXISTS "Categories son visibles para todos" ON public.categories;
CREATE POLICY "Categories son visibles para todos"
  ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo auth puede modificar categories" ON public.categories;
CREATE POLICY "Solo auth puede modificar categories"
  ON public.categories FOR ALL USING (auth.role() = 'authenticated');

-- PRODUCTS: lectura pública, escritura con auth
DROP POLICY IF EXISTS "Products son visibles para todos" ON public.products;
CREATE POLICY "Products son visibles para todos"
  ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo auth puede modificar products" ON public.products;
CREATE POLICY "Solo auth puede modificar products"
  ON public.products FOR ALL USING (auth.role() = 'authenticated');

-- CUSTOMERS: cada usuario ve su propio perfil
DROP POLICY IF EXISTS "Usuarios ven su perfil" ON public.customers;
CREATE POLICY "Usuarios ven su perfil"
  ON public.customers FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuarios modifican su perfil" ON public.customers;
CREATE POLICY "Usuarios modifican su perfil"
  ON public.customers FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Insert own profile" ON public.customers;
CREATE POLICY "Insert own profile"
  ON public.customers FOR INSERT WITH CHECK (auth.uid() = id);

-- ORDERS: cada usuario ve sus pedidos
DROP POLICY IF EXISTS "Usuarios ven sus pedidos" ON public.orders;
CREATE POLICY "Usuarios ven sus pedidos"
  ON public.orders FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Usuarios crean pedidos" ON public.orders;
CREATE POLICY "Usuarios crean pedidos"
  ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- ORDER_ITEMS
DROP POLICY IF EXISTS "Ver items de mis pedidos" ON public.order_items;
CREATE POLICY "Ver items de mis pedidos"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Crear items en mis pedidos" ON public.order_items;
CREATE POLICY "Crear items en mis pedidos"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- CART_ITEMS
DROP POLICY IF EXISTS "Usuarios ven su carrito" ON public.cart_items;
CREATE POLICY "Usuarios ven su carrito"
  ON public.cart_items FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Usuarios modifican su carrito" ON public.cart_items;
CREATE POLICY "Usuarios modifican su carrito"
  ON public.cart_items FOR ALL USING (auth.uid() = customer_id);
`;

const SEED_SQL = `
-- =====================================================
-- SEED: Datos iniciales
-- =====================================================

-- Limpiar datos existentes (en orden correcto por FK)
DELETE FROM public.order_items;
DELETE FROM public.cart_items;
DELETE FROM public.orders;
DELETE FROM public.products;
DELETE FROM public.categories;

-- Categorías
INSERT INTO public.categories (name, image) VALUES
  ('Electrónica', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400'),
  ('Deportes', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400'),
  ('Hogar', 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400'),
  ('Accesorios', 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400');

-- Productos
INSERT INTO public.products (name, category_id, price, original_price, description, images, rating, review_count, stock, variants, featured)
VALUES
  (
    'Auriculares Inalámbricos',
    (SELECT id FROM public.categories WHERE name = 'Electrónica' LIMIT 1),
    79.99, 99.99,
    'Auriculares inalámbricos premium con cancelación de ruido',
    ARRAY['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
    4.5, 128, 45,
    '{"color": ["Negro", "Blanco", "Azul"]}'::jsonb,
    true
  ),
  (
    'Reloj Inteligente',
    (SELECT id FROM public.categories WHERE name = 'Electrónica' LIMIT 1),
    199.99, NULL,
    'Rastreador de fitness avanzado con monitor de ritmo cardíaco',
    ARRAY['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    4.8, 256, 32,
    NULL,
    true
  ),
  (
    'Mochila para Laptop',
    (SELECT id FROM public.categories WHERE name = 'Accesorios' LIMIT 1),
    49.99, 69.99,
    'Mochila resistente con compartimento para laptop',
    ARRAY['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'],
    4.3, 89, 78,
    NULL,
    false
  ),
  (
    'Zapatillas para Correr',
    (SELECT id FROM public.categories WHERE name = 'Deportes' LIMIT 1),
    89.99, NULL,
    'Zapatillas cómodas para correr en todo terreno',
    ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'],
    4.6, 342, 120,
    '{"size": ["7", "8", "9", "10", "11", "12"], "color": ["Negro", "Rojo", "Azul"]}'::jsonb,
    true
  ),
  (
    'Cafetera',
    (SELECT id FROM public.categories WHERE name = 'Hogar' LIMIT 1),
    129.99, NULL,
    'Cafetera automática con temporizador programable',
    ARRAY['https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800'],
    4.4, 167, 25,
    NULL,
    false
  ),
  (
    'Lámpara de Escritorio',
    (SELECT id FROM public.categories WHERE name = 'Hogar' LIMIT 1),
    39.99, NULL,
    'Lámpara LED de escritorio con brillo ajustable',
    ARRAY['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800'],
    4.2, 93, 156,
    NULL,
    false
  ),
  (
    'Tapete de Yoga',
    (SELECT id FROM public.categories WHERE name = 'Deportes' LIMIT 1),
    29.99, NULL,
    'Tapete de yoga antideslizante con correa de transporte',
    ARRAY['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800'],
    4.7, 214, 89,
    '{"color": ["Morado", "Azul", "Rosa", "Negro"]}'::jsonb,
    false
  ),
  (
    'Botella de Agua',
    (SELECT id FROM public.categories WHERE name = 'Deportes' LIMIT 1),
    19.99, NULL,
    'Botella de agua de acero inoxidable con aislamiento térmico',
    ARRAY['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800'],
    4.5, 178, 234,
    NULL,
    true
  );
`;

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    console.log('🔌 Conectando a Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado exitosamente\n');

    // Ejecutar migración
    console.log('📦 Ejecutando migración (creando tablas, índices, RLS)...');
    await client.query(MIGRATION_SQL);
    console.log('✅ Migración completada\n');

    // Ejecutar seed
    console.log('🌱 Insertando datos iniciales (seed)...');
    await client.query(SEED_SQL);
    console.log('✅ Seed completado\n');

    // Verificar
    console.log('🔍 Verificando tablas creadas...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log('   Tablas:', tables.rows.map(r => r.table_name).join(', '));

    const catCount = await client.query('SELECT COUNT(*) FROM public.categories');
    const prodCount = await client.query('SELECT COUNT(*) FROM public.products');
    console.log(`   Categorías: ${catCount.rows[0].count}`);
    console.log(`   Productos: ${prodCount.rows[0].count}`);

    console.log('\n🎉 ¡Base de datos configurada exitosamente!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('   Detalle:', error.detail);
    if (error.hint) console.error('   Sugerencia:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
