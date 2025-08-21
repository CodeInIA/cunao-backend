// src/services/notificationService.ts

import Stripe from 'stripe';
import { sendEmail } from './emailService.js';
import stripeService from './stripeService.js';

// --- Email de Confirmación de Pedido ---
// AHORA ACEPTA el nombre del cliente
export async function sendOrderConfirmationEmail(session: any) {
  const customerEmail = session.customer_details.email;
  const customerName = session.customer_details.name.split(' ')[0]; // Obtenemos solo el primer nombre
  const orderTotal = (session.amount_total / 100).toFixed(2);

  const stripe = stripeService.getInstance();
  const lineItems = await stripe.getCheckoutSessionLineItems(session.id);

  let itemsHtml = '<ul>';
  lineItems.data.forEach((item: Stripe.LineItem) => {
    itemsHtml += `<li>${item.quantity}x - ${item.description}</li>`;
  });
  itemsHtml += '</ul>';

  const subject = `✅ ¡Confirmación de tu pedido, ${customerName}!`;
  const html = `
    <h1>¡Gracias por tu compra!</h1>
    <p>Hola ${customerName},</p>
    <p>Hemos recibido tu pedido y ya lo estamos procesando. Aquí tienes un resumen:</p>
    ${itemsHtml}
    <p><strong>Total: ${orderTotal}€</strong></p>
    <p>Recibirás otra notificación tan pronto como tu pedido sea enviado.</p>
    <p>Gracias por confiar en la sabiduría de barra de bar,</p>
    <p><strong>El equipo de Cuñadismo Ilustrado</strong></p>
  `;

  await sendEmail({ to: customerEmail, subject, html });
  console.log(`Email de confirmación de pedido enviado a ${customerEmail}`);
}


// --- Email de Pedido Enviado ---
// AHORA ACEPTA el nombre del cliente
export async function sendShippingConfirmationEmail(shipmentData: any, customerEmail: string, customerName: string) {
  const trackingNumber = shipmentData.carrier.tracking_number;
  const trackingUrl = shipmentData.carrier.tracking_url;

  const subject = `🚚 ¡Tu pedido de Cuñadismo Ilustrado ya está en camino, ${customerName}!`;
  const html = `
    <h1>¡Tu pedido ha sido enviado!</h1>
    <p>Hola ${customerName},</p>
    <p>¡Buenas noticias! Tu pedido está en manos del transportista y va de camino.</p>
    <p>Puedes seguir tu paquete usando el siguiente enlace:</p>
    <p><a href="${trackingUrl}"><strong>Seguir mi envío (Nº de seguimiento: ${trackingNumber})</strong></a></p>
    <p>¡Esperamos que disfrutes de tu dosis de sabiduría ilustrada!</p>
    <p><strong>El equipo de Cuñadismo Ilustrado</strong></p>
  `;
  
  await sendEmail({ to: customerEmail, subject, html });
  console.log(`Email de envío de pedido enviado a ${customerEmail}`);
}


// --- Email de Pedido Entregado ---
// AHORA ACEPTA el nombre del cliente
export async function sendDeliveryConfirmationEmail(deliveryData: any, customerEmail: string, customerName: string) {
  const subject = `🎉 ¡Tu pedido de Cuñadismo Ilustrado ha sido entregado, ${customerName}!`;
  const html = `
    <h1>¡Tu pedido ha sido entregado!</h1>
    <p>Hola ${customerName},</p>
    <p>El transportista nos ha confirmado que tu paquete ha sido entregado. ¡Esperamos que te encante!</p>
    <p>Nos ayudaría muchísimo si pudieras dejarnos una reseña en nuestra web o redes sociales. ¡Tu opinión es oro!</p>
    <p>Gracias por tu compra,</p>
    <p><strong>El equipo de Cuñadismo Ilustrado</strong></p>
  `;

  await sendEmail({ to: customerEmail, subject, html });
  console.log(`Email de pedido entregado enviado a ${customerEmail}`);
}