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
router.post('/reviews/publish/:id', adminAuth, csrfProtection, adminCtrl.publishReviewAdmin);
router.delete('/reviews/:id', adminAuth, csrfProtection, adminCtrl.deleteReviewAdmin);
router.post('/reviews/create', adminAuth, csrfProtection, upload.any(), adminCtrl.createReviewAdmin);

// Session helpers
router.post('/logout', adminAuth, adminCtrl.logout);
router.get('/me', adminAuth, adminCtrl.me);

export default router;
