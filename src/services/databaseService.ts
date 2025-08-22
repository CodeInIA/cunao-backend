// src/services/databaseService.ts

import mongoose, { Document, Model, Schema } from 'mongoose';

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
}

export const db = DatabaseService.getInstance();