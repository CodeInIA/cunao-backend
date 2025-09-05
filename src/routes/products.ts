import { Router } from 'express';
import {
  getProducts,
  getProduct,
  getProductVariants,
  getFeaturedProducts,
  searchProducts,
  getProductGPSR,
  syncProducts
} from '../controllers/productController.js';

const router = Router();

// Rutas de productos
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/search', searchProducts);
router.post('/sync', syncProducts); // Nuevo endpoint para sincronización manual

router.get('/:id', getProduct);

// GPSR info
router.get('/:id/gpsr', getProductGPSR);
router.get('/:id/variants', getProductVariants);

export default router;
