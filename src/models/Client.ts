import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  name: string;
  email: string;
  phone?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
  paymentInfo: {
    stripeCustomerId?: string;
    lastPaymentMethod?: string;
  };
  orderIds: string[];
  emailMarketing: boolean;
  newsletterId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    postal_code: { type: String, required: true },
    country: { type: String, required: true }
  },
  paymentInfo: {
    stripeCustomerId: { type: String },
    lastPaymentMethod: { type: String }
  },
  orderIds: [{
    type: String,
    required: true
  }],
  emailMarketing: {
    type: Boolean,
    default: false
  },
  newsletterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Newsletter'
  }
}, {
  timestamps: true
});

// Índices para optimizar búsquedas
ClientSchema.index({ email: 1 });
ClientSchema.index({ emailMarketing: 1 });
ClientSchema.index({ 'paymentInfo.stripeCustomerId': 1 });

export default mongoose.model<IClient>('Client', ClientSchema);
