// src/cron/cancelAllPrintifyOrders.ts

import dotenv from 'dotenv';
dotenv.config();
import printifyService from '../services/printifyService.js';

async function cancelAllPrintifyOrders() {
  const printify = printifyService.getInstance();
  // Obtener todas las órdenes de Printify usando el método del servicio
  const orders = await printify.getOrders();
  let cancelled = 0;
  for (const order of orders) {
    // Solo cancelar si el estado es 'pending' o 'on hold'
  if (order.status === 'pending' || order.status === 'on-hold' || order.status === 'payment-not-received') {
      try {
        const ok = await printify.cancelOrder(order.id);
        if (ok) {
          cancelled++;
          console.log(`Cancelada en Printify: ${order.id}`);
        } else {
          console.error(`No se pudo cancelar ${order.id}`);
        }
      } catch (err) {
        console.error(`Error al cancelar ${order.id}:`, err);
      }
    } else {
      console.log(`No se puede cancelar ${order.id} (estado: ${order.status})`);
    }
  }
  console.log(`Total de órdenes canceladas en Printify: ${cancelled}`);
}

cancelAllPrintifyOrders().catch((err) => {
  console.error('Error en la cancelación masiva:', err);
  process.exit(1);
});
