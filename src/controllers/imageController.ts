import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { db } from '../services/databaseService.js';
import imageServiceModule from '../services/imageService.js';

/**
 * Controlador para regenerar las imágenes optimizadas de productos existentes
 * Útil para migrar productos que fueron creados antes de implementar la optimización de imágenes
 */

// Regenerar imágenes de un producto específico
export const regenerateProductImages = asyncHandler(async (req: Request, res: Response) => {
  const productId = req.params.productId as string;

  if (!productId) {
    return res.status(400).json({ error: 'Se requiere el ID del producto' });
  }

  try {
    const product = await db.getProductByPrintifyId(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const imageService = imageServiceModule.getInstance();

    // Eliminar imágenes existentes de CDN si las hay
    const existingPublicIds: string[] = [];
    if (product.images) {
      product.images.forEach((image: any) => {
        if (image.cdnPublicId) {
          existingPublicIds.push(image.cdnPublicId);
        }
      });
    }

    if (existingPublicIds.length > 0) {
      console.log(`🗑️ Eliminando imágenes existentes de CDN para producto ${productId}`);
      await imageService.deleteImages(existingPublicIds);
    }

    // Procesar nuevamente todas las imágenes
    if (product.images && product.images.length > 0) {
      console.log(`🖼️ Regenerando imágenes para producto ${productId}`);
      
      const imageResults = await imageService.processProductImages(productId, product.images);
      
      // Actualizar el producto con las nuevas URLs de CDN
      const updatedImages = product.images.map((originalImage: any, index: number) => {
        const processedImage = imageResults.find(result => 
          result.originalUrl === originalImage.src
        );
        
        if (processedImage) {
          const cdnUrls = imageService.generateImageUrls(processedImage.cdnUrl);
          
          return {
            ...originalImage,
            cdnUrl: processedImage.cdnUrl,
            cdnPublicId: processedImage.publicId,
            cdnUrls: cdnUrls
          };
        } else {
          return originalImage;
        }
      });

      // Actualizar el producto en la base de datos
      const updatedProduct = {
        ...product.toObject(),
        images: updatedImages
      };

      await db.saveOrUpdateProduct(updatedProduct);

      console.log(`✅ Imágenes regeneradas para producto ${productId}: ${imageResults.length}/${product.images.length} procesadas`);

      res.json({
        success: true,
        message: `Imágenes regeneradas exitosamente`,
        productId: productId,
        processedImages: imageResults.length,
        totalImages: product.images.length
      });
    } else {
      res.json({
        success: true,
        message: 'El producto no tiene imágenes para procesar',
        productId: productId
      });
    }
  } catch (error) {
    console.error(`Error regenerando imágenes para producto ${productId}:`, error);
    res.status(500).json({ 
      error: 'Error interno del servidor al regenerar imágenes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Regenerar imágenes de todos los productos
export const regenerateAllProductImages = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { limit = 10, force = false } = req.query;
    
    console.log(`🔄 Iniciando regeneración de imágenes para hasta ${limit} productos`);
    
    const products = await db.getProducts();
    
    if (!products || products.length === 0) {
      return res.json({
        success: true,
        message: 'No hay productos para procesar',
        processed: 0
      });
    }

    const imageService = imageServiceModule.getInstance();
    let processedCount = 0;
    let errorCount = 0;
    const maxProducts = Math.min(parseInt(limit as string), products.length);

    // Procesar productos de uno en uno para evitar sobrecargar
    for (let i = 0; i < maxProducts; i++) {
      const product = products[i];
      
      try {
        // Solo procesar si no tiene CDN URLs o si se fuerza
        const needsProcessing = force || !product.images?.some((img: any) => img.cdnUrl);
        
        if (!needsProcessing) {
          console.log(`⏭️ Saltando producto ${product.printifyId} - ya tiene imágenes optimizadas`);
          continue;
        }

        console.log(`🖼️ Procesando producto ${i + 1}/${maxProducts}: ${product.printifyId}`);

        // Eliminar imágenes existentes de CDN si las hay
        const existingPublicIds: string[] = [];
        if (product.images) {
          product.images.forEach((image: any) => {
            if (image.cdnPublicId) {
              existingPublicIds.push(image.cdnPublicId);
            }
          });
        }

        if (existingPublicIds.length > 0) {
          await imageService.deleteImages(existingPublicIds);
        }

        // Procesar imágenes
        if (product.images && product.images.length > 0) {
          const imageResults = await imageService.processProductImages(product.printifyId, product.images);
          
          const updatedImages = product.images.map((originalImage: any) => {
            const processedImage = imageResults.find(result => 
              result.originalUrl === originalImage.src
            );
            
            if (processedImage) {
              const cdnUrls = imageService.generateImageUrls(processedImage.cdnUrl);
              
              return {
                ...originalImage,
                cdnUrl: processedImage.cdnUrl,
                cdnPublicId: processedImage.publicId,
                cdnUrls: cdnUrls
              };
            } else {
              return originalImage;
            }
          });

          // Actualizar el producto
          const updatedProduct = {
            ...product.toObject(),
            images: updatedImages
          };

          await db.saveOrUpdateProduct(updatedProduct);
          processedCount++;
          
          console.log(`✅ Producto ${product.printifyId} procesado: ${imageResults.length}/${product.images.length} imágenes`);
        }

        // Pausa entre productos para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Error procesando producto ${product.printifyId}:`, error);
        errorCount++;
      }
    }

    console.log(`🎉 Regeneración completada: ${processedCount} productos procesados, ${errorCount} errores`);

    res.json({
      success: true,
      message: 'Regeneración de imágenes completada',
      processed: processedCount,
      errors: errorCount,
      total: maxProducts
    });

  } catch (error) {
    console.error('Error en regeneración masiva de imágenes:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor en regeneración masiva',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});
