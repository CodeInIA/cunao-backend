import express from 'express';
import { getShippingConfig } from '../controllers/configController.js';

const router = express.Router();

router.get('/shipping', getShippingConfig);

export default router;
