import mongoose, { Document, Schema } from 'mongoose';

export interface INewsletter extends Document {
  email: string;
  lastToken?: string;
  preferences: {
    newsletter: boolean;
    promotions: boolean;
    newProducts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email: string) {
        // Validación básica de email
        return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
      },
      message: 'Email no válido'
    }
  },
  lastToken: {
    type: String,
    default: null
  },
  preferences: {
    newsletter: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: true
    },
    newProducts: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// No necesitamos índice manual ya que unique: true lo crea automáticamente

export default mongoose.model<INewsletter>('Newsletter', NewsletterSchema);
