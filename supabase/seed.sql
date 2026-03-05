-- =====================================================
-- Datos iniciales (Seed) para la tienda en línea
-- Ejecutar después de la migración
-- =====================================================

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
    (SELECT id FROM public.categories WHERE name = 'Electrónica'),
    79.99, 99.99,
    'Auriculares inalámbricos premium con cancelación de ruido',
    ARRAY['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
    4.5, 128, 45,
    '{"color": ["Negro", "Blanco", "Azul"]}'::jsonb,
    true
  ),
  (
    'Reloj Inteligente',
    (SELECT id FROM public.categories WHERE name = 'Electrónica'),
    199.99, NULL,
    'Rastreador de fitness avanzado con monitor de ritmo cardíaco',
    ARRAY['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    4.8, 256, 32,
    NULL,
    true
  ),
  (
    'Mochila para Laptop',
    (SELECT id FROM public.categories WHERE name = 'Accesorios'),
    49.99, 69.99,
    'Mochila resistente con compartimento para laptop',
    ARRAY['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'],
    4.3, 89, 78,
    NULL,
    false
  ),
  (
    'Zapatillas para Correr',
    (SELECT id FROM public.categories WHERE name = 'Deportes'),
    89.99, NULL,
    'Zapatillas cómodas para correr en todo terreno',
    ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'],
    4.6, 342, 120,
    '{"size": ["7", "8", "9", "10", "11", "12"], "color": ["Negro", "Rojo", "Azul"]}'::jsonb,
    true
  ),
  (
    'Cafetera',
    (SELECT id FROM public.categories WHERE name = 'Hogar'),
    129.99, NULL,
    'Cafetera automática con temporizador programable',
    ARRAY['https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800'],
    4.4, 167, 25,
    NULL,
    false
  ),
  (
    'Lámpara de Escritorio',
    (SELECT id FROM public.categories WHERE name = 'Hogar'),
    39.99, NULL,
    'Lámpara LED de escritorio con brillo ajustable',
    ARRAY['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800'],
    4.2, 93, 156,
    NULL,
    false
  ),
  (
    'Tapete de Yoga',
    (SELECT id FROM public.categories WHERE name = 'Deportes'),
    29.99, NULL,
    'Tapete de yoga antideslizante con correa de transporte',
    ARRAY['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800'],
    4.7, 214, 89,
    '{"color": ["Morado", "Azul", "Rosa", "Negro"]}'::jsonb,
    false
  ),
  (
    'Botella de Agua',
    (SELECT id FROM public.categories WHERE name = 'Deportes'),
    19.99, NULL,
    'Botella de agua de acero inoxidable con aislamiento térmico',
    ARRAY['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800'],
    4.5, 178, 234,
    NULL,
    true
  );
