import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  orderId: string; // referencia a la order
  productId: string;
  rating: number; // 1-5
  title?: string;
  body?: string;
  authorName: string;
  photos: string[]; // URLs en Cloudinary
  status: 'pending' | 'published' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema({
  orderId: { type: String, required: true, index: true },
  productId: { type: String, required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String },
  body: { type: String },
  authorName: { type: String, required: true },
  photos: [{ type: String }],
  status: { type: String, enum: ['pending','published','rejected'], default: 'pending' }
}, { timestamps: true });

const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
export default Review;
