import sharp from 'sharp';
import axios from 'axios';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface ProcessedImage {
  originalUrl: string;
  cdnUrl: string;
  publicId: string;
  variantIds: number[];
  position: string | number;
  isDefault: boolean;
}

class ImageService {
  /**
   * Verifica si una imagen ya existe en el CDN basándose en su URL original
   */
  async checkImageExists(originalUrl: string, productId: string): Promise<string | null> {
    try {
      // Generar el hash de la URL para crear un public_id consistente
      const urlHash = crypto.createHash('md5').update(originalUrl).digest('hex');
      const publicId = `cunao/products/${productId}/image_${urlHash}`;

      // Verificar si la imagen existe en Cloudinary
      const result = await cloudinary.api.resource(publicId);
      
      if (result && result.secure_url) {
        console.log(`✅ Imagen ya existe en CDN: ${result.secure_url}`);
        return result.secure_url;
      }
    } catch (error: any) {
      // Si el error es "Not Found", la imagen no existe, que es lo esperado
      if (error.http_code === 404) {
        console.log(`📋 Imagen no existe en CDN, se procesará: ${originalUrl}`);
        return null;
      }
      console.warn(`⚠️ Error verificando imagen en CDN: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Procesa una imagen individual: descarga, convierte a WebP y sube a Cloudinary
   */
  async processImage(
    imageUrl: string,
    productId: string,
    variantIds: number[],
    position: string | number,
    isDefault: boolean
  ): Promise<ProcessedImage | null> {
    try {
      // Verificar si ya existe antes de procesar
      const existingUrl = await this.checkImageExists(imageUrl, productId);
      if (existingUrl) {
        console.log(`📸 Imagen ya existía en CDN: ${imageUrl}`);
        return {
          originalUrl: imageUrl,
          cdnUrl: existingUrl,
          publicId: `cunao/products/${productId}/image_${crypto.createHash('md5').update(imageUrl).digest('hex')}`,
          variantIds,
          position,
          isDefault,
        };
      }

      console.log(`📸 Procesando nueva imagen: ${imageUrl}`);

      // Descargar la imagen
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 segundos timeout
      });

      const imageBuffer = Buffer.from(response.data);

      // Convertir a WebP con compresión optimizada para menor tamaño
      const webpBuffer = await sharp(imageBuffer)
        .webp({ 
          quality: 75,    // Calidad 75% para balance perfecto calidad/tamaño
          effort: 4,      // Esfuerzo de compresión moderado (balance velocidad/compresión)
          lossless: false // Compresión con pérdida para archivos más pequeños
        })
        // Mantener resolución original pero con menor peso
        .toBuffer();

      // Generar un public_id único pero consistente usando hash de la URL
      const urlHash = crypto.createHash('md5').update(imageUrl).digest('hex');
      const publicId = `image_${urlHash}`;

      // Subir a Cloudinary con máxima calidad WebP
      const uploadResult = await cloudinary.uploader.upload(
        `data:image/webp;base64,${webpBuffer.toString('base64')}`,
        {
          public_id: publicId,
          folder: `cunao/products/${productId}`, // Carpeta específica por producto
          format: 'webp',
          // Solo subir la imagen original en máxima calidad - sin transformaciones adicionales
        }
      );

      console.log(`✅ Imagen procesada y subida: ${uploadResult.secure_url}`);

      return {
        originalUrl: imageUrl,
        cdnUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        variantIds,
        position,
        isDefault,
      };

    } catch (error) {
      console.error(`❌ Error procesando imagen ${imageUrl}:`, error);
      return null;
    }
  }

  /**
   * Procesa todas las imágenes de un producto de Printify con sincronización inteligente
   * Solo procesa imágenes nuevas y detecta cambios en mockups
   */
  async processProductImagesSync(productId: string, images: any[]): Promise<{
    processedImages: ProcessedImage[];
    newImagesCount: number;
    skippedImagesCount: number;
    totalImages: number;
  }> {
    console.log(`🔄 Iniciando sincronización inteligente de ${images.length} imágenes para producto ${productId}`);

    const processedImages: ProcessedImage[] = [];
    let newImagesCount = 0;
    let skippedImagesCount = 0;
    
    for (const [index, image] of images.entries()) {
      const imageUrl = image.src;
      const variantIds = image.variant_ids || [];
      const position = image.position || index;
      const isDefault = image.is_default || false;

      console.log(`🖼️ Verificando imagen ${index + 1}/${images.length}: ${imageUrl}`);

      // Verificar si la imagen ya existe en CDN
      const existingCdnUrl = await this.checkImageExists(imageUrl, productId);
      
      if (existingCdnUrl) {
        // Imagen ya existe, no es necesario procesarla
        skippedImagesCount++;
        console.log(`⏭️ Imagen ${index + 1} ya existe en CDN, omitiendo procesamiento`);
        
        processedImages.push({
          originalUrl: imageUrl,
          cdnUrl: existingCdnUrl,
          publicId: `cunao/products/${productId}/image_${crypto.createHash('md5').update(imageUrl).digest('hex')}`,
          variantIds,
          position,
          isDefault,
        });
      } else {
        // Imagen nueva, procesarla
        console.log(`🆕 Procesando imagen nueva ${index + 1}/${images.length}`);
        const processedImage = await this.processImage(imageUrl, productId, variantIds, position, isDefault);
        
        if (processedImage) {
          processedImages.push(processedImage);
          newImagesCount++;
        }
      }

      // Pequeña pausa para evitar saturar Cloudinary API
      if (index < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Sincronización completada: ${newImagesCount} nuevas, ${skippedImagesCount} existentes, ${processedImages.length}/${images.length} total`);

    return {
      processedImages,
      newImagesCount,
      skippedImagesCount,
      totalImages: images.length
    };
  }

  /**
   * Procesa todas las imágenes de un producto de Printify (versión original para compatibilidad)
   */
  async processProductImages(productId: string, images: any[]): Promise<ProcessedImage[]> {
    const result = await this.processProductImagesSync(productId, images);
    return result.processedImages;
  }

  /**
   * Elimina todas las imágenes de un producto del CDN
   * Usado cuando se elimina un producto de Printify
   */
  async deleteProductImages(productId: string): Promise<{ deletedCount: number; errors: string[] }> {
    try {
      console.log(`🗑️ Eliminando todas las imágenes del producto ${productId} del CDN`);

      // Buscar todas las imágenes del producto en Cloudinary
      const searchResult = await cloudinary.search
        .expression(`folder:cunao/products/${productId}`)
        .sort_by('created_at', 'desc')
        .max_results(500) // Máximo que permite Cloudinary
        .execute();

      if (!searchResult.resources || searchResult.resources.length === 0) {
        console.log(`📁 No se encontraron imágenes para el producto ${productId} en CDN`);
        return { deletedCount: 0, errors: [] };
      }

      const publicIds = searchResult.resources.map((resource: any) => resource.public_id);
      console.log(`🔍 Encontradas ${publicIds.length} imágenes para eliminar del producto ${productId}`);

      // Eliminar las imágenes en lotes
      const batchSize = 100; // Límite de Cloudinary
      const errors: string[] = [];
      let totalDeleted = 0;

      for (let i = 0; i < publicIds.length; i += batchSize) {
        const batch = publicIds.slice(i, i + batchSize);
        
        try {
          const deleteResult = await cloudinary.api.delete_resources(batch);
          const deletedInBatch = Object.keys(deleteResult.deleted).length;
          totalDeleted += deletedInBatch;
          
          console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${deletedInBatch}/${batch.length} imágenes eliminadas`);
          
          // Registrar errores si los hay
          Object.entries(deleteResult.deleted).forEach(([publicId, status]) => {
            if (status !== 'deleted') {
              errors.push(`Error eliminando ${publicId}: ${status}`);
            }
          });
        } catch (error: any) {
          console.error(`❌ Error eliminando lote ${Math.floor(i / batchSize) + 1}:`, error.message);
          errors.push(`Error en lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        }
      }

      // Intentar eliminar la carpeta del producto si está vacía
      try {
        await cloudinary.api.delete_folder(`cunao/products/${productId}`);
        console.log(`📁 Carpeta del producto ${productId} eliminada del CDN`);
      } catch (error: any) {
        console.log(`📁 Carpeta del producto ${productId} no se pudo eliminar (puede no estar vacía): ${error.message}`);
      }

      console.log(`🎉 Limpieza completada: ${totalDeleted} imágenes eliminadas del producto ${productId}`);
      if (errors.length > 0) {
        console.warn(`⚠️ Se encontraron ${errors.length} errores durante la eliminación`);
      }

      return { deletedCount: totalDeleted, errors };

    } catch (error: any) {
      console.error(`❌ Error eliminando imágenes del producto ${productId}:`, error);
      return { deletedCount: 0, errors: [error.message] };
    }
  }

  /**
   * Limpia imágenes huérfanas del CDN que ya no están en Printify
   * Compara las imágenes actuales con las que deberían existir
   */
  async cleanupOrphanedImages(productId: string, currentImages: any[]): Promise<{ cleanedCount: number }> {
    try {
      console.log(`🧹 Limpiando imágenes huérfanas del producto ${productId}`);

      // Obtener todas las imágenes actuales del producto en CDN
      const searchResult = await cloudinary.search
        .expression(`folder:cunao/products/${productId}`)
        .sort_by('created_at', 'desc')
        .max_results(500)
        .execute();

      if (!searchResult.resources || searchResult.resources.length === 0) {
        console.log(`📁 No hay imágenes en CDN para limpiar del producto ${productId}`);
        return { cleanedCount: 0 };
      }

      // Generar los hashes de las imágenes actuales de Printify
      const currentImageHashes = new Set(
        currentImages.map(img => crypto.createHash('md5').update(img.src).digest('hex'))
      );

      // Encontrar imágenes huérfanas (que están en CDN pero no en Printify)
      const orphanedImages: string[] = [];
      
      searchResult.resources.forEach((resource: any) => {
        const publicId = resource.public_id;
        const hashMatch = publicId.match(/image_([a-f0-9]{32})$/);
        
        if (hashMatch) {
          const imageHash = hashMatch[1];
          if (!currentImageHashes.has(imageHash)) {
            orphanedImages.push(publicId);
          }
        }
      });

      if (orphanedImages.length === 0) {
        console.log(`✨ No se encontraron imágenes huérfanas para el producto ${productId}`);
        return { cleanedCount: 0 };
      }

      console.log(`🗑️ Eliminando ${orphanedImages.length} imágenes huérfanas del producto ${productId}`);

      // Eliminar imágenes huérfanas
      const deleteResult = await cloudinary.api.delete_resources(orphanedImages);
      const deletedCount = Object.keys(deleteResult.deleted).length;

      console.log(`✅ Limpieza completada: ${deletedCount} imágenes huérfanas eliminadas`);
      return { cleanedCount: deletedCount };

    } catch (error: any) {
      console.error(`❌ Error limpiando imágenes huérfanas del producto ${productId}:`, error);
      return { cleanedCount: 0 };
    }
  }

  /**
   * Elimina imágenes de Cloudinary por public_id (función legacy)
   */
  async deleteImages(publicIds: string[]): Promise<void> {
    if (publicIds.length === 0) return;

    try {
      console.log(`🗑️ Eliminando ${publicIds.length} imágenes de Cloudinary`);
      
      // Cloudinary permite eliminar múltiples imágenes a la vez
      const result = await cloudinary.api.delete_resources(publicIds);
      
      console.log(`✅ Imágenes eliminadas de Cloudinary:`, result);
    } catch (error) {
      console.error('❌ Error eliminando imágenes de Cloudinary:', error);
    }
  }

  /**
   * Genera la URL de máxima calidad original (simplificado - solo WebP original)
   */
  generateImageUrls(cdnUrl: string) {
    // Solo devolver la URL original en máxima calidad para todo
    return {
      thumbnail: cdnUrl,
      medium: cdnUrl,
      large: cdnUrl,
      original: cdnUrl
    };
  }
}

// Singleton
let imageServiceInstance: ImageService | null = null;

export function getInstance(): ImageService {
  if (!imageServiceInstance) {
    imageServiceInstance = new ImageService();
  }
  return imageServiceInstance;
}

export default {
  getInstance,
};
