#!/usr/bin/env tsx

/**
 * Script de migración para optimizar imágenes de productos existentes
 * 
 * Este script procesa productos que fueron creados antes de implementar
 * la optimización automática de imágenes con CDN.
 * 
 * Uso:
 * npm run migrate-images [-- --limit=10] [-- --force]
 * 
 * Opciones:
 * --limit: Número máximo de productos a procesar (default: 10)
 * --force: Forzar regeneración incluso si ya tienen CDN URLs
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { db } from '../services/databaseService.js';
import imageServiceModule from '../services/imageService.js';

// Cargar variables de entorno
dotenv.config();

interface MigrationOptions {
  limit: number;
  force: boolean;
}

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    limit: 10,
    force: false
  };

  args.forEach(arg => {
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1]) || 10;
    } else if (arg === '--force') {
      options.force = true;
    }
  });

  return options;
}

async function migrateProductImages(options: MigrationOptions) {
  console.log('🚀 Iniciando migración de imágenes de productos...');
  console.log(`📋 Configuración:`, options);

  try {
    // Conectar a la base de datos
    await db.connect();
    console.log('✅ Conectado a la base de datos');

    // Verificar configuración de Cloudinary
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('❌ Configuración de Cloudinary incompleta. Verifica las variables de entorno CLOUDINARY_*');
    }

    const imageService = imageServiceModule.getInstance();
    console.log('✅ Servicio de imágenes inicializado');

    // Obtener productos
    const products = await db.getProducts();
    
    if (!products || products.length === 0) {
      console.log('ℹ️ No se encontraron productos para procesar');
      return;
    }

    const maxProducts = Math.min(options.limit, products.length);
    console.log(`📊 Productos encontrados: ${products.length}, procesando: ${maxProducts}`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Procesar productos
    for (let i = 0; i < maxProducts; i++) {
      const product = products[i];
      
      try {
        // Verificar si necesita procesamiento
        const needsProcessing = options.force || !product.images?.some((img: any) => img.cdnUrl);
        
        if (!needsProcessing) {
          console.log(`⏭️ [${i + 1}/${maxProducts}] Saltando ${product.printifyId} - ya optimizado`);
          skippedCount++;
          continue;
        }

        console.log(`🔄 [${i + 1}/${maxProducts}] Procesando ${product.printifyId}: ${product.title}`);

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
          console.log(`   🗑️ Eliminando ${existingPublicIds.length} imágenes existentes de CDN...`);
          await imageService.deleteImages(existingPublicIds);
        }

        // Procesar imágenes
        if (product.images && product.images.length > 0) {
          console.log(`   🖼️ Procesando ${product.images.length} imágenes...`);
          
          const imageResults = await imageService.processProductImages(product.printifyId, product.images);
          
          // Combinar datos originales con URLs de CDN
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

          // Actualizar el producto en la base de datos
          const updatedProduct = {
            ...product.toObject(),
            images: updatedImages
          };

          await db.saveOrUpdateProduct(updatedProduct);
          
          console.log(`   ✅ Completado: ${imageResults.length}/${product.images.length} imágenes optimizadas`);
          processedCount++;
        } else {
          console.log(`   ⚠️ Sin imágenes para procesar`);
          skippedCount++;
        }

        // Pausa entre productos para no sobrecargar
        if (i < maxProducts - 1) {
          console.log(`   ⏸️ Pausando 2 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`   ❌ Error procesando ${product.printifyId}:`, error);
        errorCount++;
      }
    }

    // Resumen final
    console.log('\n🎉 Migración completada!');
    console.log(`📊 Resumen:`);
    console.log(`   ✅ Productos procesados: ${processedCount}`);
    console.log(`   ⏭️ Productos saltados: ${skippedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📈 Total evaluados: ${processedCount + skippedCount + errorCount}`);

  } catch (error) {
    console.error('❌ Error fatal en la migración:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión a la base de datos
    await mongoose.disconnect();
    console.log('✅ Conexión a la base de datos cerrada');
  }
}

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  migrateProductImages(options)
    .then(() => {
      console.log('✅ Migración finalizada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migración falló:', error);
      process.exit(1);
    });
}

export { migrateProductImages };
