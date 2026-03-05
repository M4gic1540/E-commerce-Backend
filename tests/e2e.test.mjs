/**
 * ============================================================
 *  E2E Test Suite — E-Commerce Backend API
 * ============================================================
 *  Ejecuta pruebas automatizadas contra todos los endpoints
 *  del backend NestJS + Supabase.
 *
 *  Requisitos:
 *    • Node 18+ (usa fetch nativo)
 *    • Backend corriendo en http://localhost:3000
 *
 *  Uso:
 *    node tests/e2e.test.mjs
 *
 *  Variables de entorno opcionales:
 *    API_URL        (default: http://localhost:3000/api)
 * ============================================================
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// ── Helpers ──────────────────────────────────────────────────

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];
const startTime = Date.now();

function log(msg) {
  console.log(msg);
}

function sectionHeader(name) {
  log(`\n${COLORS.cyan}${COLORS.bold}━━━ ${name} ━━━${COLORS.reset}`);
}

function ok(name, ms) {
  passed++;
  log(`  ${COLORS.green}✓${COLORS.reset} ${name} ${COLORS.dim}(${ms}ms)${COLORS.reset}`);
}

function fail(name, error) {
  failed++;
  const msg = error instanceof Error ? error.message : String(error);
  failures.push({ name, error: msg });
  log(`  ${COLORS.red}✗${COLORS.reset} ${name}`);
  log(`    ${COLORS.red}${msg}${COLORS.reset}`);
}

function skip(name, reason) {
  skipped++;
  log(`  ${COLORS.yellow}⊘${COLORS.reset} ${name} ${COLORS.dim}(${reason})${COLORS.reset}`);
}

async function request(method, path, { body, token, raw } = {}) {
  const url = `${API_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (raw) return { status: res.status, data, ok: res.ok };
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion: ${message}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
  }
}

function assertExists(value, label) {
  if (value === undefined || value === null) {
    throw new Error(`${label}: el valor no existe (null/undefined)`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label}: esperado un array, recibido ${typeof value}`);
  }
}

async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    ok(name, Date.now() - t0);
  } catch (err) {
    fail(name, err);
  }
}

// ── Estado compartido entre tests ────────────────────────────

const state = {
  // Auth
  accessToken: null,
  refreshToken: null,
  userId: null,
  testEmail: `test_${Date.now()}@yopmail.com`,
  testPassword: 'Test123456!',
  testName: 'Usuario de Prueba',

  // IDs creados durante los tests
  categoryId: null,
  productId: null,
  cartItemId: null,
  orderId: null,
  orderNumber: null,
};

// ══════════════════════════════════════════════════════════════
//  1. HEALTH CHECK
// ══════════════════════════════════════════════════════════════

async function testHealthCheck() {
  sectionHeader('HEALTH CHECK');

  await test('El servidor responde en /api', async () => {
    const res = await request('GET', '', { raw: true });
    assert(res.status < 500, `Servidor devolvió status ${res.status}`);
  });
}

// ══════════════════════════════════════════════════════════════
//  2. AUTH
// ══════════════════════════════════════════════════════════════

async function testAuth() {
  sectionHeader('AUTH');

  await test('POST /auth/register — registrar nuevo usuario', async () => {
    const data = await request('POST', '/auth/register', {
      body: {
        name: state.testName,
        email: state.testEmail,
        password: state.testPassword,
      },
    });
    assertExists(data.user, 'user');
    assertExists(data.user.id, 'user.id');
    assertExists(data.session, 'session');
    assertExists(data.session.access_token, 'access_token');
    assertExists(data.session.refresh_token, 'refresh_token');

    state.userId = data.user.id;
    state.accessToken = data.session.access_token;
    state.refreshToken = data.session.refresh_token;
  });

  await test('POST /auth/register — rechazar email duplicado', async () => {
    const res = await request('POST', '/auth/register', {
      body: {
        name: 'Otro',
        email: state.testEmail,
        password: state.testPassword,
      },
      raw: true,
    });
    assert(!res.ok, 'Debería fallar con email duplicado');
  });

  await test('POST /auth/register — rechazar datos inválidos', async () => {
    const res = await request('POST', '/auth/register', {
      body: { name: '', email: 'no-es-email', password: '123' },
      raw: true,
    });
    assert(!res.ok, 'Debería fallar con datos inválidos');
  });

  await test('POST /auth/login — iniciar sesión', async () => {
    const data = await request('POST', '/auth/login', {
      body: {
        email: state.testEmail,
        password: state.testPassword,
      },
    });
    assertExists(data.session, 'session');
    assertExists(data.session.access_token, 'access_token');
    // Actualizar tokens
    state.accessToken = data.session.access_token;
    state.refreshToken = data.session.refresh_token;
  });

  await test('POST /auth/login — rechazar credenciales incorrectas', async () => {
    const res = await request('POST', '/auth/login', {
      body: { email: state.testEmail, password: 'wrongpassword' },
      raw: true,
    });
    assert(!res.ok, 'Debería fallar con contraseña incorrecta');
  });

  await test('GET /auth/profile — obtener perfil autenticado', async () => {
    const data = await request('GET', '/auth/profile', {
      token: state.accessToken,
    });
    assertExists(data.id, 'id');
    assertEqual(data.email, state.testEmail, 'email');
  });

  await test('GET /auth/profile — rechazar sin token', async () => {
    const res = await request('GET', '/auth/profile', { raw: true });
    assert(!res.ok, 'Debería requerir autenticación');
  });

  await test('POST /auth/refresh — refrescar token', async () => {
    const data = await request('POST', '/auth/refresh', {
      body: { refresh_token: state.refreshToken },
    });
    assertExists(data.session, 'session');
    assertExists(data.session.access_token, 'nuevo access_token');
    state.accessToken = data.session.access_token;
    state.refreshToken = data.session.refresh_token;
  });
}

// ══════════════════════════════════════════════════════════════
//  3. CATEGORIES
// ══════════════════════════════════════════════════════════════

async function testCategories() {
  sectionHeader('CATEGORIES');

  await test('GET /categories — listar categorías', async () => {
    const data = await request('GET', '/categories');
    assertArray(data, 'categories');
    assert(data.length > 0, 'Debe haber al menos 1 categoría (seed)');
    assertExists(data[0].id, 'id');
    assertExists(data[0].name, 'name');
  });

  await test('POST /categories — crear categoría (auth)', async () => {
    const data = await request('POST', '/categories', {
      token: state.accessToken,
      body: { name: 'Categoría de Prueba', image: 'https://via.placeholder.com/150' },
    });
    assertExists(data.id, 'id');
    assertEqual(data.name, 'Categoría de Prueba', 'name');
    state.categoryId = data.id;
  });

  await test('POST /categories — rechazar sin autenticación', async () => {
    const res = await request('POST', '/categories', {
      body: { name: 'No debería crearse' },
      raw: true,
    });
    assert(!res.ok, 'Debería requerir autenticación');
  });

  await test('GET /categories/:id — obtener categoría por ID', async () => {
    const data = await request('GET', `/categories/${state.categoryId}`);
    assertEqual(data.id, state.categoryId, 'id');
    assertEqual(data.name, 'Categoría de Prueba', 'name');
  });

  await test('PUT /categories/:id — actualizar categoría', async () => {
    const data = await request('PUT', `/categories/${state.categoryId}`, {
      token: state.accessToken,
      body: { name: 'Categoría Actualizada' },
    });
    assertEqual(data.name, 'Categoría Actualizada', 'name');
  });

  // Soft delete + restore se prueban al final
}

// ══════════════════════════════════════════════════════════════
//  4. PRODUCTS
// ══════════════════════════════════════════════════════════════

async function testProducts() {
  sectionHeader('PRODUCTS');

  await test('GET /products — listar productos (paginado)', async () => {
    const data = await request('GET', '/products');
    assertExists(data.data, 'data');
    assertArray(data.data, 'data[]');
    assertExists(data.total, 'total');
    assertExists(data.page, 'page');
    assertExists(data.totalPages, 'totalPages');
  });

  await test('GET /products?limit=2 — paginación funciona', async () => {
    const data = await request('GET', '/products?limit=2&page=1');
    assert(data.data.length <= 2, 'Debe retornar máximo 2 productos');
    assertEqual(data.page, 1, 'page');
    assertEqual(data.limit, 2, 'limit');
  });

  await test('GET /products?search=... — búsqueda por nombre', async () => {
    const data = await request('GET', '/products?search=auriculares');
    assertArray(data.data, 'data[]');
    // Puede o no tener resultados, pero la estructura debe ser correcta
    assertExists(data.total, 'total');
  });

  await test('GET /products?sort=price_asc — ordenar por precio asc', async () => {
    const data = await request('GET', '/products?sort=price_asc');
    if (data.data.length >= 2) {
      assert(
        data.data[0].price <= data.data[1].price,
        'Primer producto debe ser más barato o igual',
      );
    }
  });

  await test('GET /products?sort=price_desc — ordenar por precio desc', async () => {
    const data = await request('GET', '/products?sort=price_desc');
    if (data.data.length >= 2) {
      assert(
        data.data[0].price >= data.data[1].price,
        'Primer producto debe ser más caro o igual',
      );
    }
  });

  await test('GET /products/featured — productos destacados', async () => {
    const data = await request('GET', '/products/featured');
    assertArray(data, 'featured');
  });

  await test('POST /products — crear producto (auth)', async () => {
    const data = await request('POST', '/products', {
      token: state.accessToken,
      body: {
        name: 'Producto de Prueba E2E',
        category_id: state.categoryId,
        price: 49.99,
        original_price: 69.99,
        description: 'Producto creado por pruebas automáticas',
        images: ['https://via.placeholder.com/300'],
        stock: 100,
        featured: false,
      },
    });
    assertExists(data.id, 'id');
    assertEqual(data.name, 'Producto de Prueba E2E', 'name');
    assertEqual(data.price, 49.99, 'price');
    assertEqual(data.stock, 100, 'stock');
    state.productId = data.id;
  });

  await test('GET /products/:id — obtener producto por ID', async () => {
    const data = await request('GET', `/products/${state.productId}`);
    assertEqual(data.id, state.productId, 'id');
    assertEqual(data.name, 'Producto de Prueba E2E', 'name');
    assertExists(data.categories, 'categories (join)');
  });

  await test('PUT /products/:id — actualizar producto', async () => {
    const data = await request('PUT', `/products/${state.productId}`, {
      token: state.accessToken,
      body: { name: 'Producto Actualizado E2E', price: 39.99 },
    });
    assertEqual(data.name, 'Producto Actualizado E2E', 'name');
    assertEqual(data.price, 39.99, 'price');
  });

  await test('GET /products?category_id=... — filtrar por categoría', async () => {
    const data = await request('GET', `/products?category_id=${state.categoryId}`);
    assertArray(data.data, 'data[]');
    if (data.data.length > 0) {
      assertEqual(data.data[0].category_id, state.categoryId, 'category_id');
    }
  });

  await test('GET /products?min_price=30&max_price=50 — filtrar por rango de precio', async () => {
    const data = await request('GET', '/products?min_price=30&max_price=50');
    assertArray(data.data, 'data[]');
    for (const p of data.data) {
      assert(p.price >= 30 && p.price <= 50, `Precio ${p.price} fuera de rango`);
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  5. CART
// ══════════════════════════════════════════════════════════════

async function testCart() {
  sectionHeader('CART');

  await test('GET /cart — carrito vacío inicial', async () => {
    const data = await request('GET', '/cart', { token: state.accessToken });
    assertExists(data.items, 'items');
    assertArray(data.items, 'items');
    assertExists(data.total_items, 'total_items');
    assertExists(data.total_price, 'total_price');
  });

  await test('POST /cart/items — agregar producto al carrito', async () => {
    const data = await request('POST', '/cart/items', {
      token: state.accessToken,
      body: { product_id: state.productId, quantity: 2 },
    });
    assertExists(data.id, 'id');
    state.cartItemId = data.id;
  });

  await test('GET /cart — carrito con 1 item', async () => {
    const data = await request('GET', '/cart', { token: state.accessToken });
    assertEqual(data.items.length, 1, 'items.length');
    assertEqual(data.total_items, 2, 'total_items');
  });

  await test('POST /cart/items — agregar mismo producto (incrementa qty)', async () => {
    const data = await request('POST', '/cart/items', {
      token: state.accessToken,
      body: { product_id: state.productId, quantity: 1 },
    });
    assertExists(data.id, 'id');
    assertEqual(data.quantity, 3, 'quantity acumulada');
    state.cartItemId = data.id;
  });

  await test('PUT /cart/items/:id — actualizar cantidad', async () => {
    const data = await request('PUT', `/cart/items/${state.cartItemId}`, {
      token: state.accessToken,
      body: { quantity: 5 },
    });
    assertExists(data.id, 'id');
  });

  await test('DELETE /cart/items/:id — eliminar item del carrito', async () => {
    const data = await request('DELETE', `/cart/items/${state.cartItemId}`, {
      token: state.accessToken,
    });
    assertExists(data.message, 'message');
  });

  await test('GET /cart — carrito vacío tras eliminar', async () => {
    const data = await request('GET', '/cart', { token: state.accessToken });
    assertEqual(data.items.length, 0, 'items.length');
  });

  // Re-agregar para la prueba de órdenes
  await test('POST /cart/items — re-agregar para test de orden', async () => {
    // El item anterior fue soft-deleted, así que se crea uno nuevo
    const res = await request('POST', '/cart/items', {
      token: state.accessToken,
      body: { product_id: state.productId, quantity: 2 },
      raw: true,
    });
    assert(res.ok, `Debería poder agregar al carrito, status: ${res.status}`);
    assertExists(res.data.id, 'id');
    state.cartItemId = res.data.id;
  });

  await test('GET /cart — rechazar sin autenticación', async () => {
    const res = await request('GET', '/cart', { raw: true });
    assert(!res.ok, 'Debería requerir autenticación');
  });
}

// ══════════════════════════════════════════════════════════════
//  6. ORDERS
// ══════════════════════════════════════════════════════════════

async function testOrders() {
  sectionHeader('ORDERS');

  await test('POST /orders — crear pedido', async () => {
    const data = await request('POST', '/orders', {
      token: state.accessToken,
      body: {
        items: [{ product_id: state.productId, quantity: 2 }],
        shipping_address: {
          first_name: 'Test',
          last_name: 'User',
          address: 'Calle de Prueba 123',
          city: 'Ciudad Test',
          state: 'Estado',
          zip_code: '12345',
          country: 'México',
        },
        shipping_method: 'standard',
        payment_method: 'card',
      },
    });
    assertExists(data.id, 'id');
    assertExists(data.order_number, 'order_number');
    assertEqual(data.status, 'pending', 'status');
    assert(data.total > 0, 'total debe ser > 0');
    state.orderId = data.id;
    state.orderNumber = data.order_number;
  });

  await test('GET /cart — carrito vacío tras crear pedido', async () => {
    const data = await request('GET', '/cart', { token: state.accessToken });
    assertEqual(data.items.length, 0, 'items.length (carrito limpiado)');
  });

  await test('GET /orders — listar pedidos', async () => {
    const data = await request('GET', '/orders', { token: state.accessToken });
    assertExists(data.data, 'data');
    assertArray(data.data, 'data[]');
    assert(data.total > 0, 'Debe haber al menos 1 pedido');
  });

  await test('GET /orders/my-orders — mis pedidos', async () => {
    const data = await request('GET', '/orders/my-orders', { token: state.accessToken });
    assertExists(data.data, 'data');
    assert(data.data.length > 0, 'Debe tener al menos 1 pedido');
  });

  await test('GET /orders/:id — detalle del pedido', async () => {
    const data = await request('GET', `/orders/${state.orderId}`, {
      token: state.accessToken,
    });
    assertEqual(data.id, state.orderId, 'id');
    assertExists(data.order_items, 'order_items');
    assertArray(data.order_items, 'order_items[]');
    assert(data.order_items.length > 0, 'Debe tener items');
  });

  await test('PUT /orders/:id/status — actualizar estado a processing', async () => {
    const data = await request('PUT', `/orders/${state.orderId}/status`, {
      token: state.accessToken,
      body: { status: 'processing' },
    });
    assertEqual(data.status, 'processing', 'status');
  });

  await test('PUT /orders/:id/status — actualizar estado a shipped', async () => {
    const data = await request('PUT', `/orders/${state.orderId}/status`, {
      token: state.accessToken,
      body: { status: 'shipped' },
    });
    assertEqual(data.status, 'shipped', 'status');
  });

  await test('POST /orders/:id/cancel — cancelar pedido enviado', async () => {
    // Primero creamos otro pedido para cancelarlo
    // Re-agregar al carrito
    await request('POST', '/cart/items', {
      token: state.accessToken,
      body: { product_id: state.productId, quantity: 1 },
    });

    const order2 = await request('POST', '/orders', {
      token: state.accessToken,
      body: {
        items: [{ product_id: state.productId, quantity: 1 }],
        shipping_address: {
          first_name: 'Test',
          last_name: 'Cancel',
          address: 'Calle Cancel 456',
          city: 'Ciudad',
          state: 'Estado',
          zip_code: '54321',
          country: 'México',
        },
      },
    });
    assertExists(order2.id, 'order2.id');

    const cancelled = await request('POST', `/orders/${order2.id}/cancel`, {
      token: state.accessToken,
    });
    assertEqual(cancelled.status, 'cancelled', 'status cancelado');
  });

  await test('POST /orders — rechazar sin stock', async () => {
    const res = await request('POST', '/orders', {
      token: state.accessToken,
      body: {
        items: [{ product_id: state.productId, quantity: 99999 }],
        shipping_address: {
          first_name: 'X',
          last_name: 'X',
          address: 'X',
          city: 'X',
          state: 'X',
          zip_code: '00000',
          country: 'X',
        },
      },
      raw: true,
    });
    assert(!res.ok, 'Debería fallar por stock insuficiente');
  });
}

// ══════════════════════════════════════════════════════════════
//  7. CUSTOMERS
// ══════════════════════════════════════════════════════════════

async function testCustomers() {
  sectionHeader('CUSTOMERS');

  await test('GET /customers — listar clientes', async () => {
    const data = await request('GET', '/customers', { token: state.accessToken });
    assertExists(data.data, 'data');
    assertArray(data.data, 'data[]');
    assert(data.total > 0, 'Debe haber al menos 1 cliente');
  });

  await test('GET /customers?search=... — buscar cliente', async () => {
    // Usar el email como término de búsqueda
    const searchTerm = encodeURIComponent(state.testEmail.split('@')[0]);
    const data = await request('GET', `/customers?search=${searchTerm}`, {
      token: state.accessToken,
    });
    assertExists(data.data, 'data');
    assertArray(data.data, 'data[]');
    assert(data.data.length > 0, 'Debe encontrar al menos 1 cliente');
  });

  await test('GET /customers/:id — obtener cliente por ID', async () => {
    const data = await request('GET', `/customers/${state.userId}`, {
      token: state.accessToken,
    });
    assertEqual(data.id, state.userId, 'id');
    assertEqual(data.email, state.testEmail, 'email');
  });

  await test('GET /customers/:id/stats — estadísticas del cliente', async () => {
    const data = await request('GET', `/customers/${state.userId}/stats`, {
      token: state.accessToken,
    });
    assertExists(data.total_orders, 'total_orders');
    assertExists(data.total_spent, 'total_spent');
    assert(data.total_orders > 0, 'Debe tener pedidos');
  });

  await test('PUT /customers/:id — actualizar perfil', async () => {
    const data = await request('PUT', `/customers/${state.userId}`, {
      token: state.accessToken,
      body: { name: 'Nombre Actualizado', phone: '+52 55 9999 8888' },
    });
    assertEqual(data.name, 'Nombre Actualizado', 'name');
    assertEqual(data.phone, '+52 55 9999 8888', 'phone');
  });
}

// ══════════════════════════════════════════════════════════════
//  8. ANALYTICS
// ══════════════════════════════════════════════════════════════

async function testAnalytics() {
  sectionHeader('ANALYTICS');

  await test('GET /analytics/dashboard — obtener dashboard', async () => {
    const data = await request('GET', '/analytics/dashboard', {
      token: state.accessToken,
    });
    assertExists(data.revenue, 'revenue');
    assertExists(data.revenue.current, 'revenue.current');
    assertExists(data.orders, 'orders');
    assertExists(data.orders.by_status, 'orders.by_status');
    assertExists(data.customers, 'customers');
    assertExists(data.products, 'products');
    assertExists(data.sales_by_month, 'sales_by_month');
    assertArray(data.sales_by_month, 'sales_by_month[]');
    assertExists(data.top_products, 'top_products');
    assertArray(data.top_products, 'top_products[]');
  });
}

// ══════════════════════════════════════════════════════════════
//  9. SOFT DELETE & RESTORE
// ══════════════════════════════════════════════════════════════

async function testSoftDelete() {
  sectionHeader('SOFT DELETE & RESTORE');

  // -- Productos --
  await test('DELETE /products/:id — soft delete producto', async () => {
    const data = await request('DELETE', `/products/${state.productId}`, {
      token: state.accessToken,
    });
    assertExists(data.message, 'message');
  });

  await test('GET /products/:id — producto eliminado no se encuentra', async () => {
    const res = await request('GET', `/products/${state.productId}`, { raw: true });
    assert(!res.ok, 'Producto eliminado no debe ser visible');
  });

  await test('GET /products — producto eliminado no aparece en listado', async () => {
    const data = await request('GET', `/products?search=Producto Actualizado E2E`);
    const found = data.data.find((p) => p.id === state.productId);
    assert(!found, 'Producto eliminado no debe aparecer en listado');
  });

  await test('PATCH /products/:id/restore — restaurar producto', async () => {
    const data = await request('PATCH', `/products/${state.productId}/restore`, {
      token: state.accessToken,
    });
    assertExists(data.message, 'message');
    assertExists(data.data, 'data');
    assertEqual(data.data.id, state.productId, 'id restaurado');
  });

  await test('GET /products/:id — producto restaurado es visible', async () => {
    const data = await request('GET', `/products/${state.productId}`);
    assertEqual(data.id, state.productId, 'id');
  });

  // -- Categorías --
  await test('DELETE /categories/:id — soft delete categoría', async () => {
    const data = await request('DELETE', `/categories/${state.categoryId}`, {
      token: state.accessToken,
    });
    assertExists(data.message, 'message');
  });

  await test('GET /categories/:id — categoría eliminada no se encuentra', async () => {
    const res = await request('GET', `/categories/${state.categoryId}`, { raw: true });
    assert(!res.ok, 'Categoría eliminada no debe ser visible');
  });

  await test('PATCH /categories/:id/restore — restaurar categoría', async () => {
    const data = await request('PATCH', `/categories/${state.categoryId}/restore`, {
      token: state.accessToken,
    });
    assertExists(data.message, 'message');
    assertExists(data.data, 'data');
  });

  await test('GET /categories/:id — categoría restaurada es visible', async () => {
    const data = await request('GET', `/categories/${state.categoryId}`);
    assertEqual(data.id, state.categoryId, 'id');
  });
}

// ══════════════════════════════════════════════════════════════
// 10. VALIDATION & EDGE CASES
// ══════════════════════════════════════════════════════════════

async function testValidation() {
  sectionHeader('VALIDACIÓN & EDGE CASES');

  await test('POST /products — rechazar sin campos requeridos', async () => {
    const res = await request('POST', '/products', {
      token: state.accessToken,
      body: { name: 'Solo nombre' },
      raw: true,
    });
    assert(!res.ok, 'Debería fallar por campos faltantes');
    assert(res.status === 400, `Status debe ser 400, recibido ${res.status}`);
  });

  await test('POST /products — rechazar precio negativo', async () => {
    const res = await request('POST', '/products', {
      token: state.accessToken,
      body: {
        name: 'Neg',
        category_id: state.categoryId,
        price: -10,
        description: 'test',
        images: [],
      },
      raw: true,
    });
    assert(!res.ok, 'Debería rechazar precio negativo');
  });

  await test('GET /products/uuid-inexistente — 404 producto no encontrado', async () => {
    const res = await request('GET', '/products/00000000-0000-0000-0000-000000000000', { raw: true });
    assert(!res.ok, 'Debería devolver 404');
  });

  await test('GET /categories/uuid-inexistente — 404 categoría no encontrada', async () => {
    const res = await request('GET', '/categories/00000000-0000-0000-0000-000000000000', { raw: true });
    assert(!res.ok, 'Debería devolver 404');
  });

  await test('POST /cart/items — rechazar cantidad 0', async () => {
    const res = await request('POST', '/cart/items', {
      token: state.accessToken,
      body: { product_id: state.productId, quantity: 0 },
      raw: true,
    });
    assert(!res.ok, 'Debería rechazar cantidad 0');
  });

  await test('POST /cart/items — rechazar producto inexistente', async () => {
    const res = await request('POST', '/cart/items', {
      token: state.accessToken,
      body: { product_id: '00000000-0000-0000-0000-000000000000', quantity: 1 },
      raw: true,
    });
    assert(!res.ok, 'Debería rechazar producto inexistente');
  });
}

// ══════════════════════════════════════════════════════════════
// 11. CLEANUP
// ══════════════════════════════════════════════════════════════

async function testCleanup() {
  sectionHeader('CLEANUP');

  await test('DELETE /products/:id — limpiar producto de prueba', async () => {
    const data = await request('DELETE', `/products/${state.productId}`, {
      token: state.accessToken,
    });
    assertExists(data.message, 'message');
  });

  await test('DELETE /categories/:id — limpiar categoría de prueba', async () => {
    const data = await request('DELETE', `/categories/${state.categoryId}`, {
      token: state.accessToken,
    });
    assertExists(data.message, 'message');
  });

  await test('POST /auth/logout — cerrar sesión', async () => {
    const data = await request('POST', '/auth/logout', {
      token: state.accessToken,
    });
    assertExists(data.message, 'message');
  });
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

async function main() {
  log(`${COLORS.bold}╔══════════════════════════════════════════════╗${COLORS.reset}`);
  log(`${COLORS.bold}║   E-Commerce API — Suite de Pruebas E2E     ║${COLORS.reset}`);
  log(`${COLORS.bold}╚══════════════════════════════════════════════╝${COLORS.reset}`);
  log(`${COLORS.dim}API: ${API_URL}${COLORS.reset}`);
  log(`${COLORS.dim}Email de prueba: ${state.testEmail}${COLORS.reset}`);
  log('');

  // Verificar que el server está corriendo
  try {
    await fetch(`${API_URL}`);
  } catch (err) {
    log(`${COLORS.red}${COLORS.bold}ERROR: No se puede conectar al servidor en ${API_URL}${COLORS.reset}`);
    log(`${COLORS.yellow}Asegúrate de que el backend esté corriendo: pnpm run start:dev${COLORS.reset}`);
    process.exit(1);
  }

  // Ejecutar suites en orden (hay dependencias entre ellas)
  await testHealthCheck();
  await testAuth();
  await testCategories();
  await testProducts();
  await testCart();
  await testOrders();
  await testCustomers();
  await testAnalytics();
  await testSoftDelete();
  await testValidation();
  await testCleanup();

  // ── Resumen ────────────────────────────────────────────────

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const total = passed + failed + skipped;

  log('');
  log(`${COLORS.bold}══════════════════════════════════════════════${COLORS.reset}`);
  log(`${COLORS.bold}  RESULTADOS${COLORS.reset}`);
  log(`${COLORS.bold}══════════════════════════════════════════════${COLORS.reset}`);
  log(`  Total:      ${total}`);
  log(`  ${COLORS.green}Pasaron:    ${passed}${COLORS.reset}`);
  if (failed > 0) log(`  ${COLORS.red}Fallaron:   ${failed}${COLORS.reset}`);
  if (skipped > 0) log(`  ${COLORS.yellow}Omitidos:   ${skipped}${COLORS.reset}`);
  log(`  Tiempo:     ${elapsed}s`);
  log('');

  if (failures.length > 0) {
    log(`${COLORS.red}${COLORS.bold}── Fallos detallados ──${COLORS.reset}`);
    failures.forEach((f, i) => {
      log(`  ${COLORS.red}${i + 1}. ${f.name}${COLORS.reset}`);
      log(`     ${COLORS.dim}${f.error}${COLORS.reset}`);
    });
    log('');
  }

  if (failed === 0) {
    log(`${COLORS.green}${COLORS.bold}🎉 ¡Todas las pruebas pasaron!${COLORS.reset}`);
  } else {
    log(`${COLORS.red}${COLORS.bold}❌ ${failed} prueba(s) fallaron.${COLORS.reset}`);
    process.exit(1);
  }
}

main().catch((err) => {
  log(`${COLORS.red}Error fatal: ${err.message}${COLORS.reset}`);
  console.error(err);
  process.exit(1);
});
