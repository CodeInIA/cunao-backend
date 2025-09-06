import express from 'express';
import { validateDiscountCode, getDiscountCode, listDiscountCodes } from '../controllers/discountController.js';

const router = express.Router();

// Validar código de descuento
router.post('/validate', validateDiscountCode);

// Obtener código de descuento específico
router.get('/:code', getDiscountCode);

// Listar todos los códigos (para administración)
router.get('/', listDiscountCodes);

export default router;
