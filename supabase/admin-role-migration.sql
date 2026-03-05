-- =====================================================
-- Migración: Agregar columna role a customers
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- =====================================================

-- Agregar columna role con valor por defecto 'customer'
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer'
CHECK (role IN ('customer', 'admin'));

-- Crear índice para búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_customers_role ON public.customers(role);
