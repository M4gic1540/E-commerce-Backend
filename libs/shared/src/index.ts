// Supabase
export { SupabaseModule } from "./supabase/supabase.module";
export { SupabaseService } from "./supabase/supabase.service";

// Constants
export {
  SERVICE_NAMES,
  SERVICE_PORTS,
  AUTH_PATTERNS,
  PRODUCTS_PATTERNS,
  CATEGORIES_PATTERNS,
  ORDERS_PATTERNS,
  CUSTOMERS_PATTERNS,
  CART_PATTERNS,
  ANALYTICS_PATTERNS,
  STORAGE_PATTERNS,
} from "./constants/services";

// DTOs
export { PaginationDto, PaginatedResult } from "./dto/pagination.dto";
export { RegisterDto, LoginDto } from "./dto/auth.dto";
export {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
} from "./dto/products.dto";
export { CreateCategoryDto, UpdateCategoryDto } from "./dto/categories.dto";
export {
  CreateOrderDto,
  QueryOrderDto,
  UpdateOrderStatusDto,
  OrderItemDto,
  ShippingAddressDto,
} from "./dto/orders.dto";
export { QueryCustomerDto } from "./dto/customers.dto";
export { AddToCartDto } from "./dto/cart.dto";
