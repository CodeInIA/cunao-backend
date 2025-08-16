import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error
  console.error('Error:', err);

  // Error de Printify API
  if (err.message.includes('Printify')) {
    error.message = 'Error al conectar con el servicio de productos';
    error.statusCode = 503;
  }

  // Error de Stripe
  if (err.message.includes('Stripe')) {
    error.message = 'Error en el procesamiento del pago';
    error.statusCode = 400;
  }

  // Error de validación
  if (err.name === 'ValidationError') {
    error.message = 'Datos de entrada inválidos';
    error.statusCode = 400;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);
