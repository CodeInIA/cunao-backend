// Tipos para productos de Printify
export interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  tags: string[];
  options: ProductOption[];
  images: ProductImage[];
  variants: PrintifyVariant[];
  print_areas?: any[];
  print_details?: any[];
  sales_channel_properties?: any[];
  is_printify_express_eligible?: boolean;
  is_printify_express_enabled?: boolean;
  is_economy_shipping_eligible?: boolean;
  is_economy_shipping_enabled?: boolean;
  blueprint_id?: number;
  user_id?: number;
  shop_id?: number;
  print_provider_id?: number;
  created_at: string;
  updated_at: string;
  visible: boolean;
  is_locked: boolean;
  external?: ExternalProduct;
}

export interface ProductOption {
  name: string;
  type: string;
  values: OptionValue[];
}

export interface OptionValue {
  id: number;
  title: string;
  colors?: string[];
}

export interface ProductImage {
  src: string;
  variant_ids: number[];
  position: string | number; // Printify puede enviar "other" o un número
  is_default: boolean;
}

export interface ExternalProduct {
  id: string;
  handle: string;
}

// Tipos para variantes de productos
export interface PrintifyVariant {
  id: number;
  sku: string;
  cost: number;
  price: number;
  title: string;
  grams: number;
  is_enabled: boolean;
  is_default: boolean;
  is_available: boolean;
  options: number[];
}

// Tipos para el carrito y pedidos
export interface CartItem {
  productId: string;
  variantId: number;
  quantity: number;
  title: string;
  price: number;
  image: string;
  size?: string;
  color?: string;
}

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  company?: string;
  region: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
  email: string;
  phone?: string;
  country: string;
}

export interface OrderRequest {
  external_id: string;
  label?: string;
  line_items: OrderLineItem[];
  shipping_method: number;
  is_printify_express: boolean;
  send_shipping_notification: boolean;
  address_to: ShippingAddress;
}

export interface OrderLineItem {
  product_id: string;
  variant_id: number;
  quantity: number;
}

export interface PrintifyOrder {
  id: string;
  external_id: string;
  label?: string;
  status: string;
  line_items: OrderLineItem[];
  address_to: ShippingAddress;
  shipments: Shipment[];
  created_at: string;
  updated_at: string;
  total_price: number;
  total_shipping: number;
  total_tax: number;
  // Campos adicionales que Printify puede incluir
  shop_id?: number;
  order_key?: string;
  display_id?: string;
  // Para tracking
  tracking_number?: string;
  tracking_url?: string;
}

export interface Shipment {
  carrier: string;
  number: string;
  url: string;
  delivered_at?: string;
}

// Tipos para Stripe
export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface CheckoutRequest {
  items: CartItem[];
  shipping_address: ShippingAddress;
  emailMarketing?: boolean;
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
