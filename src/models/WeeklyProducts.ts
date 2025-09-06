import mongoose, { Document, Schema } from 'mongoose';

export interface IWeeklyProduct extends Document {
  productId: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  printifyProductId: string;
  tags: string[];
  createdAt: Date;
  publishedAt: Date;
  weekYear: string; // Format: "2025-W36" para identificar la semana
}

const WeeklyProductSchema = new Schema<IWeeklyProduct>({
  productId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  printifyProductId: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  publishedAt: {
    type: Date,
    default: Date.now
  },
  weekYear: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Índice compuesto para consultas eficientes
WeeklyProductSchema.index({ weekYear: 1, publishedAt: -1 });

export default mongoose.model<IWeeklyProduct>('WeeklyProduct', WeeklyProductSchema);
