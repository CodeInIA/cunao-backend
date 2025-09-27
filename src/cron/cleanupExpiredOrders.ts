// src/cron/cleanupExpiredOrders.ts
import dotenv from 'dotenv';
dotenv.config();
import { db } from '../services/databaseService.js';
import stripeServiceModule from '../services/stripeService.js';
import cron from 'node-cron';

/**
 * Ejecuta una limpieza inmediata de órdenes "vacías"/incompletas antiguas.
 * Criterio: status: 'pending', createdAt < ahora-24h, sin printifyOrderId,
 * y además que parezcan incompletas (sin customerEmail y sin stripeSessionId) —
 * o si tienen stripeSessionId se comprueba en Stripe antes de borrar.
 */
export async function cleanupExpiredOrders(): Promise<void> {
  await db.connect();

  const OrderModel: any = (db as any).OrderModel;
  if (!OrderModel) {
    throw new Error('No se pudo obtener el modelo Order desde databaseService');
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas
  console.log(`Buscando órdenes pendientes (status: 'pending') creadas antes de: ${cutoff.toISOString()}`);

  // Buscar órdenes candidatas: pending, creadas hace >24h, sin printifyOrderId
  const candidates = await OrderModel.find({
    status: 'pending',
    createdAt: { $lt: cutoff },
    $or: [
      { printifyOrderId: { $exists: false } },
      { printifyOrderId: null },
      { printifyOrderId: '' }
    ]
  }).exec();

  console.log(`Encontradas ${candidates.length} órdenes candidatas a limpieza`);

  let stripeService: any = null;
  try {
    stripeService = stripeServiceModule.getInstance();
  } catch (err) {
    console.warn('No se pudo inicializar Stripe (clave no configurada?) — se omitirá la verificación de sesión para órdenes con stripeSessionId.');
    stripeService = null;
  }

  let deleted = 0;
  for (const order of candidates) {
    try {
      // Definición de "vacía/incompleta": sin customerEmail y sin stripeSessionId
      const hasCustomer = !!(order.customerEmail && order.customerEmail.trim());
      const hasStripeSession = !!(order.stripeSessionId && order.stripeSessionId.trim());

      // Si la orden tiene customer, la consideramos en proceso y la saltamos
      if (hasCustomer) {
        console.log(`Saltando orden ${order.orderId} porque tiene customerEmail (${order.customerEmail})`);
        continue;
      }

      // Si no tiene stripeSessionId -> es claramente incompleta -> borrar
      if (!hasStripeSession) {
        await OrderModel.deleteOne({ _id: order._id }).exec();
        console.log(`Eliminada orden incompleta antigua (sin stripeSessionId): ${order.orderId} (createdAt=${order.createdAt})`);
        deleted++;
        continue;
      }

      // Si tiene stripeSessionId, verificar en Stripe si está pagada. Si no paga -> borrar.
      if (hasStripeSession) {
        if (!stripeService) {
          console.log(`No se puede verificar sesión stripe ${order.stripeSessionId} para order ${order.orderId} — saltando para seguridad.`);
          continue; // no arriesgamos a borrar si no podemos verificar
        }

        try {
          const session = await stripeService.getCheckoutSession(order.stripeSessionId);
          const paid = session && (session.payment_status === 'paid' || session.status === 'complete' || session.payment_status === 'no_payment_required');
          if (paid) {
            console.log(`Orden ${order.orderId} tiene sesión Stripe pagada (${order.stripeSessionId}) — no borrar.`);
            continue;
          } else {
            await OrderModel.deleteOne({ _id: order._id }).exec();
            console.log(`Eliminada orden con sesión Stripe no pagada: ${order.orderId} (session=${order.stripeSessionId})`);
            deleted++;
            continue;
          }
        } catch (err: any) {
          console.warn(`Error comprobando sesión Stripe ${order.stripeSessionId} para order ${order.orderId}: ${err?.message || err}`);
          console.log('Por seguridad, se omitirá la eliminación de esta orden.');
          continue;
        }
      }

    } catch (err: any) {
      console.error(`Error al procesar orden ${order.orderId}:`, err?.message || err);
    }
  }

  console.log(`Limpieza finalizada. Órdenes eliminadas: ${deleted}`);
}

// Scheduler: ejecutar automáticamente cada hora (en el minuto 0)
export function startCleanupScheduler(): void {
  console.log('Iniciando scheduler de limpieza de órdenes expiradas (cada hora).');
  // Ejecutar inmediatamente una primera vez en entorno de producción; en dev no automática
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) {
    // En producción, programamos la limpieza para que corra una vez al día a las 02:00 AM
    // (Formato cron: minute hour day month weekday)
    cron.schedule('0 2 * * *', async () => {
      try {
        await cleanupExpiredOrders();
      } catch (err) {
        console.error('Error en job programado cleanupExpiredOrders:', err);
      }
    });
    // Ejecutar ya la primera vez al arrancar (opcional) y luego cada 24h a las 02:00
    cleanupExpiredOrders().catch(err => console.error('Error al ejecutar limpieza inicial:', err));
  } else {
    console.log('[DEV] Scheduler de limpieza desactivado en desarrollo. Usa `npm run cleanup-orders` para ejecutar manualmente.');
  }
}

// Permitir ejecución manual vía CLI: si el script fue llamado directamente (tsx src/cron/cleanupExpiredOrders.ts)
if (process.argv.some(arg => arg.includes('cleanupExpiredOrders.ts'))) {
  cleanupExpiredOrders().catch(err => {
    console.error('Error en cleanupExpiredOrders:', err);
    process.exit(1);
  }).then(() => process.exit(0));
}
