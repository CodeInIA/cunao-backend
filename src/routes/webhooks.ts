import { Router } from 'express';
import {
  handleStripeWebhook,
  handlePrintifyWebhook
} from '../controllers/webhookController';

const router = Router();

// Rutas de webhooks
router.post('/stripe', handleStripeWebhook);
router.post('/printify', handlePrintifyWebhook);

export default router;
