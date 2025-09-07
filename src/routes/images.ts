import { Router } from 'express';
import { regenerateProductImages, regenerateAllProductImages } from '../controllers/imageController.js';

const router = Router();

/**
 * Rutas para manejo de imágenes
 * Estas rutas son útiles para administración y migración de productos existentes
 */

// POST /api/images/regenerate/:productId - Regenerar imágenes de un producto específico
router.post('/regenerate/:productId', regenerateProductImages);

// POST /api/images/regenerate-all - Regenerar imágenes de todos los productos
// Query params opcionales: 
// - limit: número máximo de productos a procesar (default: 10)
// - force: forzar regeneración incluso si ya tienen CDN URLs (default: false)
router.post('/regenerate-all', regenerateAllProductImages);

export default router;
