import sharp from 'sharp';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface ProcessedImage {
  originalUrl: string;
  cdnUrl: string;
  publicId: string;
  variantIds: number[];
  position: string | number;
  isDefault: boolean;
}

class ImageService {
  /**
   * Procesa una imagen: la descarga, convierte a WebP y sube a Cloudinary
   */
  async processImage(
    imageUrl: string, 
    productId: string, 
    imageIndex: number,
    variantIds: number[] = [],
    position: string | number = 'other',
    isDefault: boolean = false
  ): Promise<ProcessedImage | null> {
    try {
      console.log(`Procesando imagen ${imageIndex} del producto ${productId}: ${imageUrl}`);

      // Descargar la imagen
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 segundos timeout
      });

      const imageBuffer = Buffer.from(response.data);

      // Convertir a WebP con compresión optimizada
      const webpBuffer = await sharp(imageBuffer)
        .webp({ 
          quality: 85, // Buena calidad manteniendo tamaño pequeño
          effort: 4    // Balance entre velocidad y compresión
        })
        .toBuffer();

      // Generar un public_id único para Cloudinary
      const publicId = `cunao/products/${productId}/image_${imageIndex}_${Date.now()}`;

      // Subir a Cloudinary
      const uploadResult = await cloudinary.uploader.upload(
        `data:image/webp;base64,${webpBuffer.toString('base64')}`,
        {
          public_id: publicId,
          folder: 'cunao/products',
          format: 'webp',
          transformation: [
            // Crear múltiples versiones de la imagen
            { width: 800, height: 800, crop: 'fit', quality: 'auto' }, // Para vista de producto
          ],
          eager: [
            { width: 400, height: 400, crop: 'fit', quality: 'auto' }, // Para thumbnails
            { width: 1200, height: 1200, crop: 'fit', quality: 'auto' }, // Para zoom
          ],
          eager_async: true,
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
   * Procesa todas las imágenes de un producto de Printify
   */
  async processProductImages(productId: string, images: any[]): Promise<ProcessedImage[]> {
    console.log(`🖼️ Iniciando procesamiento de ${images.length} imágenes para producto ${productId}`);

    const processedImages: ProcessedImage[] = [];
    
    // Procesar imágenes en paralelo pero con límite para no sobrecargar
    const batchSize = 3; // Procesar 3 imágenes a la vez
    
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      
      const batchPromises = batch.map((image, batchIndex) => 
        this.processImage(
          image.src,
          productId,
          i + batchIndex,
          image.variant_ids || [],
          image.position || 'other',
          image.is_default || false
        )
      );

      const batchResults = await Promise.all(batchPromises);
      
      // Agregar solo las imágenes procesadas exitosamente
      batchResults.forEach(result => {
        if (result) {
          processedImages.push(result);
        }
      });

      // Pequeña pausa entre batches para no sobrecargar el servidor
      if (i + batchSize < images.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Procesamiento completado: ${processedImages.length}/${images.length} imágenes procesadas exitosamente`);

    return processedImages;
  }

  /**
   * Elimina imágenes de Cloudinary por public_id
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
   * Genera URLs de diferentes tamaños para una imagen
   */
  generateImageUrls(cdnUrl: string) {
    // Extraer el public_id de la URL de Cloudinary
    const publicIdMatch = cdnUrl.match(/\/v\d+\/(.+)\.[^.]+$/);
    if (!publicIdMatch) return { thumbnail: cdnUrl, medium: cdnUrl, large: cdnUrl };

    const publicId = publicIdMatch[1];
    const baseUrl = cdnUrl.substring(0, cdnUrl.lastIndexOf('/'));

    return {
      thumbnail: `${baseUrl}/w_400,h_400,c_fit,q_auto/${publicId}.webp`,
      medium: `${baseUrl}/w_800,h_800,c_fit,q_auto/${publicId}.webp`,
      large: `${baseUrl}/w_1200,h_1200,c_fit,q_auto/${publicId}.webp`,
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
