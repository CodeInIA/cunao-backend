import express from 'express';
import * as adminCtrl from '../controllers/adminController.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// Public login
router.post('/login', adminCtrl.login);

// Protected admin routes
router.get('/reviews', adminAuth, adminCtrl.listReviewsAdmin);
router.post('/reviews/publish/:id', adminAuth, adminCtrl.publishReviewAdmin);
router.delete('/reviews/:id', adminAuth, adminCtrl.deleteReviewAdmin);
router.post('/reviews/create', adminAuth, adminCtrl.createReviewAdmin);

export default router;
