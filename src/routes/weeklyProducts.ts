import { Router } from 'express';
import { body } from 'express-validator';
import { 
  addProductToWeekly, 
  getWeeklyProducts, 
  sendNewProductsEmailTest 
} from '../controllers/weeklyProductsController.js';

const router = Router();

// POST /api/weekly-products/add - Agregar producto a la colección semanal
router.post('/add', [
  body('productId').notEmpty().withMessage('productId es requerido'),
  body('title').notEmpty().withMessage('title es requerido'),
  body('description').notEmpty().withMessage('description es requerido'),
  body('imageUrl').isURL().withMessage('imageUrl debe ser una URL válida'),
  body('price').isNumeric().withMessage('price debe ser un número'),
  body('printifyProductId').notEmpty().withMessage('printifyProductId es requerido')
], addProductToWeekly);

// GET /api/weekly-products - Obtener productos de la semana
router.get('/', getWeeklyProducts);

// POST /api/weekly-products/send-email - Envío manual de email (solo para testing)
router.post('/send-email', sendNewProductsEmailTest);

export default router;
