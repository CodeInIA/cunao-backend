import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IDiscountCode extends Document {
  code: string;
  discountPercentage: number;
  expiryDate?: Date;
  isActive: boolean;
  appliesTo?: 'subtotal' | 'shipping';
  maxUses?: number | null;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
  isValid(): boolean;
}

interface IDiscountCodeModel extends Model<IDiscountCode> {
  findValidCode(code: string): Promise<IDiscountCode | null>;
}

const DiscountCodeSchema: Schema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(code: string) {
        // Validar que el código tenga al menos 3 caracteres y permita letras españolas, números y algunos símbolos
        return /^[A-ZÁÉÍÓÚÑ0-9_-]{3,20}$/.test(code);
      },
      message: 'El código debe tener entre 3 y 20 caracteres y solo puede contener letras (incluida Ñ), números, guiones y guiones bajos'
    }
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
    validate: {
      validator: function(percentage: number) {
        return Number.isInteger(percentage);
      },
      message: 'El porcentaje de descuento debe ser un número entero entre 1 y 100'
    }
  },
  expiryDate: {
    type: Date,
    default: null,
    validate: {
      validator: function(date: Date | null) {
        if (date === null) return true; // Permitir códigos permanentes
        return date > new Date(); // La fecha debe ser futura
      },
      message: 'La fecha de expiración debe ser futura'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
  ,
  appliesTo: {
    type: String,
    enum: ['subtotal', 'shipping'],
    default: 'subtotal'
  },
  maxUses: {
    type: Number,
    default: null,
    min: 1,
    validate: {
      validator: function(uses: number | null) {
        if (uses === null) return true; // Usos ilimitados
        return Number.isInteger(uses) && uses > 0;
      },
      message: 'El número máximo de usos debe ser un número entero positivo'
    }
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// El índice único se crea automáticamente por la propiedad "unique: true" en el campo code

// Método para verificar si el código está vigente
DiscountCodeSchema.methods.isValid = function(): boolean {
  if (!this.isActive) return false;
  if (this.maxUses !== null && this.usedCount >= this.maxUses) return false; // Usos agotados
  if (!this.expiryDate) return true; // Código permanente
  return new Date() < this.expiryDate;
};

// Método estático para encontrar código válido
DiscountCodeSchema.statics.findValidCode = function(code: string) {
  return this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    $and: [
      {
        $or: [
          { expiryDate: null },
          { expiryDate: { $gt: new Date() } }
        ]
      },
      {
        $or: [
          { maxUses: null },
          { $expr: { $lt: ['$usedCount', '$maxUses'] } }
        ]
      }
    ]
  });
};

export default mongoose.model<IDiscountCode, IDiscountCodeModel>('DiscountCode', DiscountCodeSchema);
