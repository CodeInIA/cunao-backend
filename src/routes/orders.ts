import { Router } from 'express';
import {
  createPaymentIntent,
  createCheckoutSession,
  processOrder,
  getOrderStatus,
  calculateShipping
} from '../controllers/orderController.js';

const router = Router();

// Rutas de pedidos
router.post('/payment-intent', createPaymentIntent);
router.post('/checkout-session', createCheckoutSession);
router.post('/process', processOrder);
router.post('/shipping', calculateShipping);
router.get('/:orderId/status', getOrderStatus);

export default router;
