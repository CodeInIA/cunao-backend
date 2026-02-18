import mongoose, { Document, Schema } from 'mongoose';

export interface IWeeklyProduct extends Document {
  printifyId: string;
  publishedAt: Date;
  weekYear: string; // Format: "2025-W36" para identificar la semana
}

const WeeklyProductSchema = new Schema<IWeeklyProduct>({
  printifyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
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
