import express from 'express';
import * as adminCtrl from '../controllers/adminController.js';
import { adminAuth, csrfProtection } from '../middleware/adminAuth.js';
import multer from 'multer';

// multer in memory (para subida de imágenes desde admin)
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 } });

const router = express.Router();

// Public login
router.post('/login', adminCtrl.login);

// Protected admin routes
router.get('/reviews', adminAuth, adminCtrl.listReviewsAdmin);
router.get('/products', adminAuth, adminCtrl.listProductsAdmin);
router.put('/products/:id/tags', adminAuth, csrfProtection, adminCtrl.updateProductTagsAdmin);
router.post('/reviews/publish/:id', adminAuth, csrfProtection, adminCtrl.publishReviewAdmin);
router.delete('/reviews/:id', adminAuth, csrfProtection, adminCtrl.deleteReviewAdmin);
router.post('/reviews/create', adminAuth, csrfProtection, upload.any(), adminCtrl.createReviewAdmin);

// Discount code management
router.get('/discount-codes', adminAuth, adminCtrl.listDiscountCodesAdmin);
router.post('/discount-codes', adminAuth, csrfProtection, adminCtrl.createDiscountCodeAdmin);
router.put('/discount-codes/:id', adminAuth, csrfProtection, adminCtrl.updateDiscountCodeAdmin);
router.delete('/discount-codes/:id', adminAuth, csrfProtection, adminCtrl.deleteDiscountCodeAdmin);

// Session helpers
router.post('/logout', adminAuth, adminCtrl.logout);
router.get('/me', adminAuth, adminCtrl.me);

export default router;
