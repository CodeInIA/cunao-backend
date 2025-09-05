// src/services/databaseService.ts

import mongoose, { Document, Model, Schema } from 'mongoose';

// --- Interfaz para definir la estructura de un Producto ---
interface IProduct extends Document {
  printifyId: string;
  title: string;
  description: string;
  tags: string[];
  images: {
    src: string;
    alt?: string;
    position: number;
    is_default: boolean;
  }[];
  variants: {
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
  }[];
  options: {
    name: string;
    type: string;
    values: {
      id: number;
      title: string;
      colors?: string[];
    }[];
  }[];
  print_areas: any[];
  print_details: any[];
  sales_channel_properties: any[];
  is_locked: boolean;
  visible: boolean;
  is_printify_express_eligible: boolean;
  is_printify_express_enabled: boolean;
  is_economy_shipping_eligible: boolean;
  is_economy_shipping_enabled: boolean;
  blueprint_id: number;
  user_id: number;
  shop_id: number;
  print_provider_id: number;
  created_at: string;
  updated_at: string;
  lastSyncedAt: Date;
}

// --- Esquema de Mongoose para el Producto ---
const ProductSchema: Schema = new Schema({
  printifyId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  tags: [{ type: String }],
  images: [{
    src: { type: String, required: true },
    alt: { type: String },
    position: { type: Number, required: true },
    is_default: { type: Boolean, default: false }
  }],
  variants: [{
    id: { type: Number, required: true },
    sku: { type: String },
    cost: { type: Number },
    price: { type: Number },
    title: { type: String },
    grams: { type: Number },
    is_enabled: { type: Boolean, default: true },
    is_default: { type: Boolean, default: false },
    is_available: { type: Boolean, default: true },
    options: [{ type: Number }]
  }],
  options: [{
    name: { type: String },
    type: { type: String },
    values: [{
      id: { type: Number },
      title: { type: String },
      colors: [{ type: String }]
    }]
  }],
  print_areas: [{ type: Schema.Types.Mixed }],
  print_details: [{ type: Schema.Types.Mixed }],
  sales_channel_properties: [{ type: Schema.Types.Mixed }],
  is_locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  is_printify_express_eligible: { type: Boolean, default: false },
  is_printify_express_enabled: { type: Boolean, default: false },
  is_economy_shipping_eligible: { type: Boolean, default: false },
  is_economy_shipping_enabled: { type: Boolean, default: false },
  blueprint_id: { type: Number },
  user_id: { type: Number },
  shop_id: { type: Number },
  print_provider_id: { type: Number },
  created_at: { type: String },
  updated_at: { type: String },
  lastSyncedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

// --- Interfaz para definir la estructura de un Pedido ---
interface IOrder extends Document {
  printifyOrderId?: string;
  stripeSessionId: string;
  customerEmail: string;
  customerName: string;
  lineItems: {
    productId: string;
    variantId: number;
    title: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
  }[];
  shippingDetails: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  trackingUrl?: string;
  region?: string;
}

// --- Esquema de Mongoose para el Pedido ---
const OrderSchema: Schema = new Schema({
  printifyOrderId: { type: String, index: true },
  stripeSessionId: { type: String, required: false, index: true },
  customerEmail: { type: String, required: false },
  customerName: { type: String, required: false },
  lineItems: [{
    productId: String,
    variantId: Number,
    title: String,
    size: String,
    color: String,
    quantity: Number,
    price: Number,
  }],
  shippingDetails: {
    address: String,
    city: String,
    postalCode: String,
    country: String,
    phone: String,
  },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  trackingNumber: String,
  trackingUrl: String,
  region: { type: String },
}, {
  timestamps: true
});

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

class DatabaseService {
  // Actualizar pedido por _id
  public async findOrderByIdAndUpdate(orderId: string, updateData: Partial<IOrder>): Promise<IOrder | null> {
    return Order.findByIdAndUpdate(orderId, updateData, { new: true }).exec();
  }
  private static instance: DatabaseService;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('Error: La variable de entorno MONGO_URI no está definida.');
      process.exit(1);
    }
    try {
      await mongoose.connect(mongoUri);
      console.log('🔌 Conectado a la base de datos MongoDB con éxito.');
    } catch (error) {
      console.error('❌ Error al conectar con MongoDB:', error);
      process.exit(1);
    }
  }

  public async saveOrder(orderData: Partial<IOrder>): Promise<IOrder> {
    const newOrder = new Order(orderData);
    await newOrder.save();
    console.log(`Pedido ${newOrder._id} guardado en la base de datos.`);
    return newOrder;
  }
  
  // NUEVA FUNCIÓN para encontrar un pedido por el ID de sesión de Stripe y actualizarlo
  public async findOrderByStripeIdAndUpdate(stripeId: string, updateData: Partial<IOrder>): Promise<IOrder | null> {
    return Order.findOneAndUpdate({ stripeSessionId: stripeId }, updateData, { new: true }).exec();
  }

  public async findOrderByPrintifyId(printifyId: string): Promise<IOrder | null> {
    return Order.findOne({ printifyOrderId: printifyId }).exec();
  }

  public async updateOrderByPrintifyId(printifyId: string, updateData: Partial<IOrder>): Promise<IOrder | null> {
    return Order.findOneAndUpdate({ printifyOrderId: printifyId }, updateData, { new: true }).exec();
  }

  // === MÉTODOS PARA PRODUCTOS ===

  /**
   * Guardar o actualizar un producto en la base de datos
   */
  public async saveOrUpdateProduct(productData: any): Promise<IProduct> {
    const existingProduct = await Product.findOne({ printifyId: productData.id }).exec();
    
    if (existingProduct) {
      // Actualizar producto existente
      const updatedProduct = await Product.findOneAndUpdate(
        { printifyId: productData.id },
        {
          ...this.mapPrintifyProductToDb(productData),
          lastSyncedAt: new Date()
        },
        { new: true }
      ).exec();
      console.log(`Producto ${productData.id} actualizado en la base de datos.`);
      return updatedProduct!;
    } else {
      // Crear nuevo producto
      const newProduct = new Product({
        ...this.mapPrintifyProductToDb(productData),
        lastSyncedAt: new Date()
      });
      await newProduct.save();
      console.log(`Producto ${productData.id} guardado en la base de datos.`);
      return newProduct;
    }
  }

  /**
   * Obtener todos los productos visibles de la base de datos
   */
  public async getProducts(): Promise<IProduct[]> {
    return Product.find({ visible: true }).exec();
  }

  /**
   * Obtener un producto por su ID de Printify
   */
  public async getProductByPrintifyId(printifyId: string): Promise<IProduct | null> {
    return Product.findOne({ printifyId }).exec();
  }

  /**
   * Obtener un producto por su título slug
   */
  public async getProductBySlug(slug: string): Promise<IProduct | null> {
    // Buscar por título que coincida con el slug
    const products = await Product.find({ visible: true }).exec();
    return products.find(p => this.slugify(p.title) === slug) || null;
  }

  /**
   * Eliminar un producto por su ID de Printify
   */
  public async deleteProductByPrintifyId(printifyId: string): Promise<boolean> {
    const result = await Product.deleteOne({ printifyId }).exec();
    if (result.deletedCount > 0) {
      console.log(`Producto ${printifyId} eliminado de la base de datos.`);
      return true;
    }
    console.log(`No se encontró el producto ${printifyId} para eliminar.`);
    return false;
  }

  /**
   * Mapear datos de producto de Printify al formato de base de datos
   */
  private mapPrintifyProductToDb(printifyProduct: any): Partial<IProduct> {
    return {
      printifyId: printifyProduct.id,
      title: printifyProduct.title,
      description: printifyProduct.description || '',
      tags: printifyProduct.tags || [],
      images: printifyProduct.images?.map((img: any, index: number) => ({
        src: img.src,
        alt: img.alt || printifyProduct.title,
        position: img.position || index,
        is_default: img.is_default || index === 0
      })) || [],
      variants: printifyProduct.variants || [],
      options: printifyProduct.options || [],
      print_areas: printifyProduct.print_areas || [],
      print_details: printifyProduct.print_details || [],
      sales_channel_properties: printifyProduct.sales_channel_properties || [],
      is_locked: printifyProduct.is_locked || false,
      visible: printifyProduct.visible !== false, // Por defecto true
      is_printify_express_eligible: printifyProduct.is_printify_express_eligible || false,
      is_printify_express_enabled: printifyProduct.is_printify_express_enabled || false,
      is_economy_shipping_eligible: printifyProduct.is_economy_shipping_eligible || false,
      is_economy_shipping_enabled: printifyProduct.is_economy_shipping_enabled || false,
      blueprint_id: printifyProduct.blueprint_id,
      user_id: printifyProduct.user_id,
      shop_id: printifyProduct.shop_id,
      print_provider_id: printifyProduct.print_provider_id,
      created_at: printifyProduct.created_at,
      updated_at: printifyProduct.updated_at
    };
  }

  /**
   * Función para generar slug (debe ser idéntica a la del frontend)
   */
  private slugify(text: string): string {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .replace(/ñ/g, 'n')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

export const db = DatabaseService.getInstance();