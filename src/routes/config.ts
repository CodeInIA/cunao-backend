import express from 'express';
import { getShippingConfig } from '../controllers/configController';

const router = express.Router();

router.get('/shipping', getShippingConfig);

export default router;
