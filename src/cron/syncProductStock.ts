// src/cron/syncProductStock.ts
import * as dotenv from 'dotenv';
dotenv.config();
import * as cron from 'node-cron';
import { db } from '../services/databaseService.js';
import printifyServiceModule from '../services/printifyService.js';

/**
 * Sincroniza el estado de stock (is_available) de todas las variantes
 * de los productos en la base de datos con los datos actuales de Printify.
 * 
 * Printify no emite un webhook cuando cambia el stock de un proveedor,
 * así que necesitamos consultar periódicamente la API para mantener
 * el campo `is_available` actualizado.
 */
export async function syncProductStock(): Promise<void> {
  console.log('📦 [Stock Sync] Iniciando sincronización de stock con Printify...');

  try {
    const products = await db.getProducts();

    if (!products || products.length === 0) {
      console.log('📦 [Stock Sync] No hay productos en la base de datos para sincronizar.');
      return;
    }

    const printifyService = printifyServiceModule.getInstance();
    let updatedCount = 0;
    let errorCount = 0;

    for (const dbProduct of products) {
      try {
        const printifyProduct = await printifyService.getProduct(dbProduct.printifyId);

        if (!printifyProduct) {
          console.warn(`⚠️ [Stock Sync] Producto ${dbProduct.printifyId} (${dbProduct.title}) no encontrado en Printify.`);
          errorCount++;
          continue;
        }

        // Comparar variantes y detectar cambios en is_available
        let hasChanges = false;
        const updatedVariants = dbProduct.variants.map(dbVariant => {
          const printifyVariant = printifyProduct.variants?.find(
            (pv: any) => pv.id === dbVariant.id
          );

          if (printifyVariant) {
            if (dbVariant.is_available !== printifyVariant.is_available ||
                dbVariant.is_enabled !== printifyVariant.is_enabled) {
              hasChanges = true;

              if (dbVariant.is_available !== printifyVariant.is_available) {
                console.log(
                  `  🔄 ${dbProduct.title} - Variante "${dbVariant.title}": ` +
                  `is_available ${dbVariant.is_available} → ${printifyVariant.is_available}`
                );
              }
              if (dbVariant.is_enabled !== printifyVariant.is_enabled) {
                console.log(
                  `  🔄 ${dbProduct.title} - Variante "${dbVariant.title}": ` +
                  `is_enabled ${dbVariant.is_enabled} → ${printifyVariant.is_enabled}`
                );
              }

              return {
                ...dbVariant,
                is_available: printifyVariant.is_available,
                is_enabled: printifyVariant.is_enabled,
              };
            }
          }

          return dbVariant;
        });

        if (hasChanges) {
          // Actualizar solo las variantes del producto en la BD
          await db.saveOrUpdateProduct({
            ...printifyProduct,
            // Preservar las imágenes CDN existentes en la BD
            images: dbProduct.images,
          });
          updatedCount++;
        }

        // Pequeña pausa para respetar el rate limit de Printify (600 req/min)
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (productError: any) {
        console.error(`❌ [Stock Sync] Error procesando producto ${dbProduct.printifyId}:`, productError.message);
        errorCount++;
      }
    }

    console.log(
      `📦 [Stock Sync] Sincronización completada. ` +
      `Productos revisados: ${products.length}, ` +
      `Actualizados: ${updatedCount}, ` +
      `Errores: ${errorCount}`
    );
  } catch (error: any) {
    console.error('❌ [Stock Sync] Error general en la sincronización de stock:', error.message);
  }
}

/**
 * Inicia el scheduler de sincronización de stock.
 * Ejecuta cada 30 minutos para mantener el stock actualizado.
 */
export function startStockSyncScheduler(): void {
  // Ejecutar cada 30 minutos
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ [Stock Sync] Ejecutando sincronización programada de stock...');
    await syncProductStock();
  });

  console.log('📦 [Stock Sync] Scheduler de sincronización de stock iniciado (cada 30 min).');

  // Ejecutar una primera sincronización al arrancar (con delay para que la BD esté lista)
  setTimeout(async () => {
    console.log('📦 [Stock Sync] Ejecutando primera sincronización de stock al arrancar...');
    await syncProductStock();
  }, 15000); // 15 segundos después del inicio
}
