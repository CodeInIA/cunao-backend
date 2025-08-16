import { Router } from 'express';
import {
  getProducts,
  getProduct,
  getProductVariants,
  getFeaturedProducts,
  searchProducts
} from '../controllers/productController';

const router = Router();

// Rutas de productos
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/search', searchProducts);
router.get('/:id', getProduct);
router.get('/:id/variants', getProductVariants);

export default router;
