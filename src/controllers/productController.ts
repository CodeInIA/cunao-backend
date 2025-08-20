import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import printifyServiceModule from '../services/printifyService';
import { ApiResponse, PrintifyProduct } from '../types/index.js';

// Función para generar slug (debe ser idéntica a la de webhookController y frontend)
function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/ñ/g, 'n') // Reemplazar ñ por n
    .normalize('NFD') // Separar tildes de las letras
    .replace(/[\u0300-\u036f]/g, '') // Eliminar los caracteres de tildes
    .trim()
    .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
    .replace(/[\s_-]+/g, '-') // Reemplazar espacios y guiones bajos por un solo guion
    .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio y al final
}

// Función de ayuda para encontrar un producto por slug o ID
async function findProductByIdentifier(identifier: string): Promise<PrintifyProduct | null> {
  const printifyService = printifyServiceModule.getInstance();
  
  // 1. Intentar encontrar por slug (ineficiente pero necesario sin DB)
  const allProducts = await printifyService.getProducts();
  const productBySlug = allProducts.find(p => slugify(p.title) === identifier);

  if (productBySlug) {
    // Devolvemos el producto completo para tener todos los datos
    return printifyService.getProduct(productBySlug.id);
  }

  // 2. Si no se encuentra por slug, intentar encontrar por ID como fallback
  return printifyService.getProduct(identifier);
}

// Obtener todos los productos
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const printifyService = printifyServiceModule.getInstance();
  const products = await printifyService.getProducts();

  // Filtrar solo productos visibles
  const visibleProducts = products.filter(product => product.visible);

  const response: ApiResponse<PrintifyProduct[]> = {
    success: true,
    data: visibleProducts,
    message: `${visibleProducts.length} productos encontrados`
  };

  res.status(200).json(response);
});

// Obtener un producto específico por SLUG o ID
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id: identifier } = req.params;
  const product = await findProductByIdentifier(identifier);
  
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

// Obtener variantes de un producto por SLUG o ID
export const getProductVariants = asyncHandler(async (req: Request, res: Response) => {
  const { id: identifier } = req.params;
  const product = await findProductByIdentifier(identifier);

  if (!product) {
    return res.status(404).json({ success: false, error: 'Producto no encontrado' });
  }
  
  const printifyService = printifyServiceModule.getInstance();
  const variants = await printifyService.getProductVariants(product.id);
  
  const response = {
    success: true,
    data: variants,
    message: `${variants.length} variantes encontradas`
  };

  res.status(200).json(response);
});

// Obtener información GPSR de un producto por SLUG o ID
export const getProductGPSR = asyncHandler(async (req: Request, res: Response) => {
  const { id: identifier } = req.params;
  const product = await findProductByIdentifier(identifier);

  if (!product) {
    // Printify devuelve un array vacío si no encuentra GPSR, imitamos ese comportamiento
    return res.status(200).json({ success: true, data: [] });
  }

  const printifyService = printifyServiceModule.getInstance();
  const gpsr = await printifyService.getProductGPSR(product.id);
  res.status(200).json({ success: true, data: gpsr });
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
