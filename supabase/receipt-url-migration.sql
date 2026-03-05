-- =====================================================
-- Migración: columna receipt_url en tabla orders
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- =====================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

COMMENT ON COLUMN public.orders.receipt_url IS
  'URL firmada (Supabase Storage) de la boleta PDF generada al completar el pedido';
