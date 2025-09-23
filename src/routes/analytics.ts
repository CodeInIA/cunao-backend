import { Router } from 'express';
import analyticsController from '../controllers/analyticsController.js';

const router = Router();

router.post('/collect', analyticsController.collect);

export default router;
