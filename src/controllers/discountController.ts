import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import DiscountCode from '../models/DiscountCode.js';
import { ApiResponse } from '../types/index.js';

interface ValidateDiscountRequest {
  code: string;
  subtotal: number;
}

interface ValidateDiscountResponse {
  isValid: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  finalTotal?: number;
  message?: string;
}

// Validar código de descuento
export const validateDiscountCode = asyncHandler(async (req: Request, res: Response) => {
  const { code, subtotal }: ValidateDiscountRequest = req.body;
  
  if (!code || !code.trim()) {
    const response: ApiResponse<ValidateDiscountResponse> = {
      success: false,
      error: 'El código de descuento es requerido'
    };
    return res.status(400).json(response);
  }
  
  if (!subtotal || subtotal <= 0) {
    const response: ApiResponse<ValidateDiscountResponse> = {
      success: false,
      error: 'El subtotal debe ser mayor a 0'
    };
    return res.status(400).json(response);
  }

  try {
    // Buscar código válido
    const discountCode = await DiscountCode.findValidCode(code.trim());
    
    if (!discountCode) {
      const response: ApiResponse<ValidateDiscountResponse> = {
        success: true,
        data: {
          isValid: false,
          message: 'El código de descuento no es válido o ha expirado'
        }
      };
      return res.status(200).json(response);
    }

    // Calcular descuento
    const discountAmount = (subtotal * discountCode.discountPercentage) / 100;
    const finalTotal = Math.max(0, subtotal - discountAmount);

    const response: ApiResponse<ValidateDiscountResponse> = {
      success: true,
      data: {
        isValid: true,
        discountPercentage: discountCode.discountPercentage,
        discountAmount: Math.round(discountAmount * 100) / 100, // Redondear a 2 decimales
        finalTotal: Math.round(finalTotal * 100) / 100,
        message: `¡Código válido! ${discountCode.discountPercentage}% de descuento aplicado`
      }
    };

    res.status(200).json(response);

  } catch (error: any) {
    console.error('Error validando código de descuento:', error);
    const response: ApiResponse<ValidateDiscountResponse> = {
      success: false,
      error: 'Error al validar el código de descuento'
    };
    res.status(500).json(response);
  }
});

// Obtener código de descuento por código (para uso interno)
export const getDiscountCode = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  
  try {
    const discountCode = await DiscountCode.findValidCode(code);
    
    if (!discountCode) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Código de descuento no encontrado o expirado'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        code: discountCode.code,
        discountPercentage: discountCode.discountPercentage,
        expiryDate: discountCode.expiryDate,
        isActive: discountCode.isActive,
        isValid: discountCode.isValid()
      }
    };

    res.status(200).json(response);

  } catch (error: any) {
    console.error('Error obteniendo código de descuento:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener el código de descuento'
    };
    res.status(500).json(response);
  }
});

// Listar todos los códigos de descuento (para administración)
export const listDiscountCodes = asyncHandler(async (req: Request, res: Response) => {
  try {
    const discountCodes = await DiscountCode.find({})
      .sort({ createdAt: -1 })
      .select('code discountPercentage expiryDate isActive createdAt');

    const codesWithStatus = discountCodes.map(code => ({
      ...code.toObject(),
      isValid: code.isValid(),
      status: code.isValid() ? 'Activo' : 'Expirado/Inactivo'
    }));

    const response: ApiResponse<any[]> = {
      success: true,
      data: codesWithStatus,
      message: `${codesWithStatus.length} códigos de descuento encontrados`
    };

    res.status(200).json(response);

  } catch (error: any) {
    console.error('Error listando códigos de descuento:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener los códigos de descuento'
    };
    res.status(500).json(response);
  }
});
