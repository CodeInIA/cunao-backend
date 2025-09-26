import express from 'express';
import * as adminCtrl from '../controllers/adminController.js';
import { adminAuth, csrfProtection } from '../middleware/adminAuth.js';

const router = express.Router();

// Public login
router.post('/login', adminCtrl.login);

// Protected admin routes
router.get('/reviews', adminAuth, adminCtrl.listReviewsAdmin);
router.post('/reviews/publish/:id', adminAuth, csrfProtection, adminCtrl.publishReviewAdmin);
router.delete('/reviews/:id', adminAuth, csrfProtection, adminCtrl.deleteReviewAdmin);
router.post('/reviews/create', adminAuth, csrfProtection, adminCtrl.createReviewAdmin);

// Session helpers
router.post('/logout', adminAuth, adminCtrl.logout);
router.get('/me', adminAuth, adminCtrl.me);

export default router;
