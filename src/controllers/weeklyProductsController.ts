import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ApiResponse } from '../types';
import { addWeeklyProduct, sendNewProductsEmailManual } from '../cron/weeklyNewProducts.js';
import WeeklyProduct from '../models/WeeklyProducts.js';
import { db, IProduct } from '../services/databaseService.js';

// Agregar producto a la colección semanal
export const addProductToWeekly = asyncHandler(async (req: Request, res: Response) => {
  const { printifyId } = req.body;

  if (!printifyId) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Falta el campo requerido: printifyId'
    };
    return res.status(400).json(response);
  }

  try {
    const success = await addWeeklyProduct(printifyId);

    if (success) {
      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Producto agregado exitosamente a productos semanales' }
      };
      return res.status(201).json(response);
    } else {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Error agregando producto a la colección semanal'
      };
      return res.status(500).json(response);
    }
  } catch (error: any) {
    console.error('Error agregando producto semanal:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error interno del servidor'
    };
    return res.status(500).json(response);
  }
});

// Obtener productos de la semana actual (devuelve datos completos desde la colección Product)
export const getWeeklyProducts = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { week } = req.query;
    const currentWeek = week || getCurrentWeekYear();

    const weeklyRefs = await WeeklyProduct.find({ weekYear: currentWeek })
      .sort({ publishedAt: -1 })
      .lean();

    const products = await Promise.all(
      weeklyRefs.map(ref => db.getProductByPrintifyId(ref.printifyId))
    );

    const response: ApiResponse<IProduct[]> = {
      success: true,
      data: products.filter((p): p is IProduct => p !== null)
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error obteniendo productos semanales:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error obteniendo productos semanales'
    };
    return res.status(500).json(response);
  }
});

// Envío manual de email de nuevos productos
export const sendNewProductsEmailTest = asyncHandler(async (req: Request, res: Response) => {
  try {
    await sendNewProductsEmailManual();
    
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Email de nuevos productos enviado exitosamente' }
    };
    
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error enviando email de nuevos productos:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error enviando email de nuevos productos'
    };
    return res.status(500).json(response);
  }
});

// Función helper para obtener la semana del año
const getCurrentWeekYear = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const daysSinceStartOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((daysSinceStartOfYear + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};
