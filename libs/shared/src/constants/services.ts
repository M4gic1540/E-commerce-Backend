/** Nombres de los servicios para inyección de ClientProxy */
export const SERVICE_NAMES = {
  AUTH: "AUTH_SERVICE",
  PRODUCTS: "PRODUCTS_SERVICE",
  ORDERS: "ORDERS_SERVICE",
  CUSTOMERS: "CUSTOMERS_SERVICE",
  CART: "CART_SERVICE",
  ANALYTICS: "ANALYTICS_SERVICE",
  STORAGE: "STORAGE_SERVICE",
} as const;

/** Puertos TCP de cada microservicio */
export const SERVICE_PORTS = {
  GATEWAY: 3000,
  AUTH: 3001,
  PRODUCTS: 3002,
  ORDERS: 3003,
  CUSTOMERS: 3004,
  CART: 3005,
  ANALYTICS: 3006,
  STORAGE: 3007,
} as const;

/** Patrones de mensajes para comunicación inter-servicio */
export const AUTH_PATTERNS = {
  REGISTER: "auth.register",
  LOGIN: "auth.login",
  REFRESH: "auth.refresh",
  LOGOUT: "auth.logout",
  PROFILE: "auth.profile",
  VALIDATE_TOKEN: "auth.validate_token",
  GET_ROLE: "auth.getRole",
} as const;

export const PRODUCTS_PATTERNS = {
  FIND_ALL: "products.findAll",
  FIND_ONE: "products.findOne",
  FIND_FEATURED: "products.findFeatured",
  CREATE: "products.create",
  UPDATE: "products.update",
  REMOVE: "products.remove",
  RESTORE: "products.restore",
} as const;

export const CATEGORIES_PATTERNS = {
  FIND_ALL: "categories.findAll",
  FIND_ONE: "categories.findOne",
  CREATE: "categories.create",
  UPDATE: "categories.update",
  REMOVE: "categories.remove",
  RESTORE: "categories.restore",
} as const;

export const ORDERS_PATTERNS = {
  FIND_ALL: "orders.findAll",
  FIND_ONE: "orders.findOne",
  FIND_BY_CUSTOMER: "orders.findByCustomer",
  CREATE: "orders.create",
  UPDATE_STATUS: "orders.updateStatus",
  CANCEL: "orders.cancel",
  GENERATE_RECEIPT: "orders.generateReceipt",
  GET_RECEIPT: "orders.getReceipt",
} as const;

export const CUSTOMERS_PATTERNS = {
  FIND_ALL: "customers.findAll",
  FIND_ONE: "customers.findOne",
  GET_STATS: "customers.getStats",
  UPDATE: "customers.update",
} as const;

export const CART_PATTERNS = {
  GET_CART: "cart.getCart",
  ADD_ITEM: "cart.addItem",
  UPDATE_QUANTITY: "cart.updateQuantity",
  REMOVE_ITEM: "cart.removeItem",
  CLEAR_CART: "cart.clearCart",
} as const;

export const ANALYTICS_PATTERNS = {
  DASHBOARD: "analytics.dashboard",
} as const;

export const STORAGE_PATTERNS = {
  UPLOAD: "storage.upload",
  DELETE: "storage.delete",
  LIST: "storage.list",
} as const;
