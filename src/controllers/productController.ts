import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import printifyServiceModule from '../services/printifyService.js';
import { db } from '../services/databaseService.js';
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

// Función de ayuda para encontrar un producto por slug o ID desde MongoDB
async function findProductByIdentifier(identifier: string): Promise<any | null> {
  // 1. Intentar encontrar por slug
  const productBySlug = await db.getProductBySlug(identifier);
  if (productBySlug) {
    return productBySlug;
  }

  // 2. Si no se encuentra por slug, intentar encontrar por ID de Printify
  return await db.getProductByPrintifyId(identifier);
}

// Convertir producto de MongoDB al formato esperado por el frontend
function mapDbProductToApiFormat(dbProduct: any): PrintifyProduct {
  return {
    id: dbProduct.printifyId,
    title: dbProduct.title,
    description: dbProduct.description,
    tags: dbProduct.tags,
    images: dbProduct.images,
    variants: dbProduct.variants,
    options: dbProduct.options,
    print_areas: dbProduct.print_areas,
    print_details: dbProduct.print_details,
    sales_channel_properties: dbProduct.sales_channel_properties,
    is_locked: dbProduct.is_locked,
    visible: dbProduct.visible,
    is_printify_express_eligible: dbProduct.is_printify_express_eligible,
    is_printify_express_enabled: dbProduct.is_printify_express_enabled,
    is_economy_shipping_eligible: dbProduct.is_economy_shipping_eligible,
    is_economy_shipping_enabled: dbProduct.is_economy_shipping_enabled,
    blueprint_id: dbProduct.blueprint_id,
    user_id: dbProduct.user_id,
    shop_id: dbProduct.shop_id,
    print_provider_id: dbProduct.print_provider_id,
    created_at: dbProduct.created_at,
    updated_at: dbProduct.updated_at
  };
}

// Obtener todos los productos
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Obtener productos de MongoDB
    const dbProducts = await db.getProducts();
    
    // Convertir al formato esperado por el frontend
    const products = dbProducts.map(mapDbProductToApiFormat);

    const response: ApiResponse<PrintifyProduct[]> = {
      success: true,
      data: products,
      message: `${products.length} productos encontrados`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error al obtener productos de la base de datos:', error);
    
    // Fallback: Si hay error con la BD, intentar obtener de Printify
    console.log('Intentando obtener productos de Printify como fallback...');
    const printifyService = printifyServiceModule.getInstance();
    const products = await printifyService.getProducts();
    const visibleProducts = products.filter(product => product.visible);

    const response: ApiResponse<PrintifyProduct[]> = {
      success: true,
      data: visibleProducts,
      message: `${visibleProducts.length} productos encontrados (desde Printify)`
    };

    res.status(200).json(response);
  }
});

// Obtener un producto específico por SLUG o ID
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id: identifier } = req.params;
  
  try {
    // Buscar en MongoDB primero
    const dbProduct = await findProductByIdentifier(identifier);
    
    if (!dbProduct) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    const product = mapDbProductToApiFormat(dbProduct);

    const response: ApiResponse<PrintifyProduct> = {
      success: true,
      data: product
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error al obtener producto de la base de datos:', error);
    
    // Fallback: Si hay error, intentar obtener de Printify
    console.log('Intentando obtener producto de Printify como fallback...');
    const printifyService = printifyServiceModule.getInstance();
    const product = await printifyService.getProduct(identifier);
    
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
  }
});

// Obtener variantes de un producto por SLUG o ID
export const getProductVariants = asyncHandler(async (req: Request, res: Response) => {
  const { id: identifier } = req.params;
  
  try {
    // Buscar en MongoDB primero
    const dbProduct = await findProductByIdentifier(identifier);

    if (!dbProduct) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    const response = {
      success: true,
      data: dbProduct.variants || [],
      message: `${(dbProduct.variants || []).length} variantes encontradas`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error al obtener variantes de la base de datos:', error);
    
    // Fallback: Si hay error, intentar obtener de Printify
    console.log('Intentando obtener variantes de Printify como fallback...');
    const product = await findProductByIdentifier(identifier);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    
    const printifyService = printifyServiceModule.getInstance();
    const variants = await printifyService.getProductVariants(product.printifyId || identifier);
    
    const response = {
      success: true,
      data: variants,
      message: `${variants.length} variantes encontradas (desde Printify)`
    };

    res.status(200).json(response);
  }
});

// Obtener información GPSR de un producto por SLUG o ID
export const getProductGPSR = asyncHandler(async (req: Request, res: Response) => {
  const { id: identifier } = req.params;
  
  try {
    const dbProduct = await findProductByIdentifier(identifier);

    if (!dbProduct) {
      // Printify devuelve un array vacío si no encuentra GPSR, imitamos ese comportamiento
      return res.status(200).json({ success: true, data: [] });
    }

    // Para GPSR aún necesitamos usar Printify ya que no guardamos esa info en MongoDB
    const printifyService = printifyServiceModule.getInstance();
    const gpsr = await printifyService.getProductGPSR(dbProduct.printifyId);
    res.status(200).json({ success: true, data: gpsr });
  } catch (error) {
    console.error('Error al obtener GPSR:', error);
    res.status(200).json({ success: true, data: [] });
  }
});

// Obtener productos destacados (los más populares)
export const getFeaturedProducts = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Obtener productos de MongoDB
    const dbProducts = await db.getProducts();
    
    // Filtrar productos destacados
    const featuredProducts = dbProducts
      .filter(product => 
        product.visible && 
        (
          product.tags.map(tag => tag.toLowerCase()).includes('destacado') ||
          product.tags.map(tag => tag.toLowerCase()).includes('popular') ||
          product.tags.map(tag => tag.toLowerCase()).includes('clásico')
        )
      )
      .slice(0, 6) // Máximo 6 productos destacados
      .map(mapDbProductToApiFormat);

    const response: ApiResponse<PrintifyProduct[]> = {
      success: true,
      data: featuredProducts,
      message: `${featuredProducts.length} productos destacados`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error al obtener productos destacados de la base de datos:', error);
    
    // Fallback: Si hay error con la BD, intentar obtener de Printify
    console.log('Intentando obtener productos destacados de Printify como fallback...');
    const printifyService = printifyServiceModule.getInstance();
    const products = await printifyService.getProducts();
    
    const featuredProducts = products
      .filter(product => 
        product.visible && 
        (
          product.tags.map(tag => tag.toLowerCase()).includes('destacado') ||
          product.tags.map(tag => tag.toLowerCase()).includes('popular') ||
          product.tags.map(tag => tag.toLowerCase()).includes('clásico')
        )
      )
      .slice(0, 6);

    const response: ApiResponse<PrintifyProduct[]> = {
      success: true,
      data: featuredProducts,
      message: `${featuredProducts.length} productos destacados (desde Printify)`
    };

    res.status(200).json(response);
  }
});

// Buscar productos
export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const { q, category, minPrice, maxPrice } = req.query;
  
  try {
    // Obtener productos de MongoDB
    let dbProducts = await db.getProducts();
    
    // Filtrar por término de búsqueda
    if (q && typeof q === 'string') {
      const searchTerm = q.toLowerCase();
      dbProducts = dbProducts.filter((product: any) =>
        product.title.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.tags.some((tag: any) => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    // Filtrar por categoría (usando tags)
    if (category && typeof category === 'string') {
      dbProducts = dbProducts.filter((product: any) =>
        product.tags.includes(category.toLowerCase())
      );
    }

    // Convertir al formato esperado
    const products = dbProducts.map(mapDbProductToApiFormat);

    const response: ApiResponse<PrintifyProduct[]> = {
      success: true,
      data: products,
      message: `${products.length} productos encontrados`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error al buscar productos en la base de datos:', error);
    
    // Fallback: Si hay error con la BD, intentar buscar en Printify
    console.log('Intentando buscar productos en Printify como fallback...');
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
      message: `${products.length} productos encontrados (desde Printify)`
    };

    res.status(200).json(response);
  }
});

// Sincronizar productos desde Printify a MongoDB (endpoint manual)
export const syncProducts = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('Iniciando sincronización de productos desde Printify...');
    const printifyService = printifyServiceModule.getInstance();
    const products = await printifyService.getProducts();
    
    let syncedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Obtener el producto completo con todos los detalles
        const fullProduct = await printifyService.getProduct(product.id);
        if (fullProduct) {
          await db.saveOrUpdateProduct(fullProduct);
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error sincronizando producto ${product.id}:`, error);
        errorCount++;
      }
    }

    const response = {
      success: true,
      message: `Sincronización completada. ${syncedCount} productos sincronizados, ${errorCount} errores`,
      data: {
        synced: syncedCount,
        errors: errorCount,
        total: products.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error durante la sincronización:', error);
    res.status(500).json({
      success: false,
      error: 'Error durante la sincronización de productos'
    });
  }
});
