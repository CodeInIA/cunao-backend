#!/usr/bin/env node

/**
 * Script para sincronizar productos desde Printify a MongoDB
 * Uso: node scripts/sync-products.js
 */

import dotenv from 'dotenv';
import { db } from '../src/services/databaseService.js';
import printifyServiceModule from '../src/services/printifyService.js';

// Cargar variables de entorno
dotenv.config();

async function syncAllProducts() {
  try {
    console.log('🚀 Iniciando sincronización de productos...');
    
    // Conectar a la base de datos
    await db.connect();
    console.log('✅ Conectado a MongoDB');
    
    // Obtener productos de Printify
    const printifyService = printifyServiceModule.getInstance();
    const products = await printifyService.getProducts();
    console.log(`📦 Encontrados ${products.length} productos en Printify`);
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      try {
        console.log(`📥 Sincronizando producto: ${product.title} (${product.id})`);
        
        // Obtener el producto completo
        const fullProduct = await printifyService.getProduct(product.id);
        
        if (fullProduct) {
          await db.saveOrUpdateProduct(fullProduct);
          syncedCount++;
          console.log(`✅ Producto ${product.id} sincronizado`);
        } else {
          console.log(`⚠️ No se pudo obtener detalles del producto ${product.id}`);
          errorCount++;
        }
        
        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error sincronizando producto ${product.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Resumen de sincronización:');
    console.log(`✅ Productos sincronizados: ${syncedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📦 Total procesados: ${products.length}`);
    
    if (syncedCount > 0) {
      console.log('\n🎉 Sincronización completada exitosamente!');
    } else {
      console.log('\n⚠️ No se sincronizó ningún producto. Revisa los logs de error.');
    }
    
  } catch (error) {
    console.error('💥 Error fatal durante la sincronización:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  syncAllProducts();
}

export { syncAllProducts };
