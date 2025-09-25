import { Router } from 'express';
import multer from 'multer';
import { validateToken, submitReview } from '../controllers/reviewController.js';

const router = Router();

// multer in memory
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 } }); // 3MB por archivo

// Validar token (GET)
router.get('/validate/:token', validateToken);

// Enviar review (POST) - multipart, archivos opcionales
// Esperamos campos 'payload' (JSON) y archivos con fieldnames product-<productId>
router.post('/submit/:token', upload.any(), submitReview);

// Listado público de reviews publicadas
import { listReviews } from '../controllers/reviewController.js';
router.get('/list', listReviews);
import { publishReview, generateTokenForOrder } from '../controllers/reviewController.js';

// Admin endpoints (protegidos por x-admin-key)
router.post('/publish/:id', publishReview);
router.post('/generate-token/:orderId', generateTokenForOrder);

export default router;
