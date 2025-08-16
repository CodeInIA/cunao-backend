import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import printifyServiceModule from '../services/printifyService';
import { ApiResponse, PrintifyProduct } from '../types/index';

// Obtener todos los productos
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const printifyService = printifyServiceModule.getInstance();
  const products = await printifyService.getProducts();
  
  // Filtrar solo productos visibles y con frases de cuñao
  const cunaoProducts = products.filter(product => 
    product.visible && 
    (product.title.toLowerCase().includes('cuñao') || 
     product.description.toLowerCase().includes('cuñao') ||
     product.tags.some(tag => tag.toLowerCase().includes('cuñao')))
  );

  const response: ApiResponse<PrintifyProduct[]> = {
    success: true,
    data: cunaoProducts,
    message: `${cunaoProducts.length} productos encontrados`
  };

  res.status(200).json(response);
});

// Obtener un producto específico
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const printifyService = printifyServiceModule.getInstance();
  const product = await printifyService.getProduct(id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Producto no encontrado'
    });
  }

  const response: ApiResponse<PrintifyProduct> = {
    success: true,
    data: product
  };

  res.status(200).json(response);
});

// Obtener variantes de un producto
export const getProductVariants = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const printifyService = printifyServiceModule.getInstance();
  const variants = await printifyService.getProductVariants(id);
  
  const response = {
    success: true,
    data: variants,
    message: `${variants.length} variantes encontradas`
  };

  res.status(200).json(response);
});

// Obtener productos destacados (los más populares)
export const getFeaturedProducts = asyncHandler(async (req: Request, res: Response) => {
  const printifyService = printifyServiceModule.getInstance();
  const products = await printifyService.getProducts();
  
  // Filtrar productos destacados (podrías usar tags específicos o lógica personalizada)
  const featuredProducts = products
    .filter(product => 
      product.visible && 
      (product.tags.includes('destacado') || product.tags.includes('popular'))
    )
    .slice(0, 6); // Máximo 6 productos destacados

  const response: ApiResponse<PrintifyProduct[]> = {
    success: true,
    data: featuredProducts,
    message: `${featuredProducts.length} productos destacados`
  };

  res.status(200).json(response);
});

// Buscar productos
export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const { q, category, minPrice, maxPrice } = req.query;
  
  const printifyService = printifyServiceModule.getInstance();
  let products = await printifyService.getProducts();
  
  // Filtrar solo productos visibles
  products = products.filter((product: any) => product.visible);
  
  // Filtrar por término de búsqueda
  if (q && typeof q === 'string') {
    const searchTerm = q.toLowerCase();
    products = products.filter((product: any) =>
      product.title.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm) ||
      product.tags.some((tag: any) => tag.toLowerCase().includes(searchTerm))
    );
  }
  
  // Filtrar por categoría (usando tags)
  if (category && typeof category === 'string') {
    products = products.filter((product: any) =>
      product.tags.includes(category.toLowerCase())
    );
  }

  const response: ApiResponse<PrintifyProduct[]> = {
    success: true,
    data: products,
    message: `${products.length} productos encontrados`
  };

  res.status(200).json(response);
});
