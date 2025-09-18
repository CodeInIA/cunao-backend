// src/cron/cancelAllPrintifyOrders.ts

import dotenv from 'dotenv';
dotenv.config();
import printifyService from '../services/printifyService';

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
      } catch (err: any) {
        let errorMessage = `Error al cancelar el pedido ${order.id} en Printify:`;
        if (err.response && err.response.data && err.response.data.message) {
          errorMessage += ` ${err.response.data.message}`;
          if (err.response.data.errors && err.response.data.errors.reason) {
            errorMessage += ` (Razón: ${err.response.data.errors.reason})`;
          }
        } else if (err.message) {
          errorMessage += ` ${err.message}`;
        } else {
          errorMessage += ` Ocurrió un error desconocido.`;
        }
        console.error(errorMessage);
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
