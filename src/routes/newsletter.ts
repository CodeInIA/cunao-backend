import express from 'express';
import { subscribeToNewsletter } from '../controllers/newsletterController.js';

const router = express.Router();

// POST /api/newsletter/subscribe
router.post('/subscribe', subscribeToNewsletter);

export default router;
