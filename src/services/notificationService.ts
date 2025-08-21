// src/services/notificationService.ts

import Stripe from 'stripe';
import { sendEmail } from './emailService.js';
import stripeService from './stripeService.js';

// --- PLANTILLA PRINCIPAL DE EMAIL ---
// Esta función crea el "marco" del correo con el estilo de tu marca.
const generateEmailTemplate = (title: string, content: string): string => {
  const LOGO_URL = 'https://www.cunadismoilustrado.me/logo-sin-letras.png'; // He subido tu logo a un hosting de imágenes
  const WEBSITE_URL = process.env.FRONTEND_URL || 'https://www.cunadismoilustrado.me';

  // Colores de tu marca
  const backgroundColor = '#1a202c'; // Azul oscuro de fondo
  const contentBackgroundColor = '#2d3748'; // Gris oscuro para el contenido
  const textColor = '#ffffff';
  const accentColor = '#eab308'; // Amarillo/dorado para botones y enlaces

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 20px 0;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: ${contentBackgroundColor}; border-radius: 8px; overflow: hidden;">
              <tr>
                <td align="center" style="padding: 30px 0;">
                  <a href="${WEBSITE_URL}">
                    <img src="${LOGO_URL}" alt="Cuñadismo Ilustrado" width="150" style="display: block;" />
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; color: ${textColor}; font-size: 16px; line-height: 1.5;">
                  <h1 style="color: ${textColor}; font-size: 24px;">${title}</h1>
                  ${content}
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 20px 30px; font-size: 12px; color: #718096;">
                  <p>&copy; ${new Date().getFullYear()} Cuñadismo Ilustrado. Todos los derechos reservados.</p>
                  <p><a href="${WEBSITE_URL}" style="color: ${accentColor}; text-decoration: none;">Visita nuestra tienda</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// --- Email de Confirmación de Pedido ---
export async function sendOrderConfirmationEmail(session: any) {
  const customerEmail = session.customer_details.email;
  const customerName = session.customer_details.name.split(' ')[0];
  const orderTotal = (session.amount_total / 100).toFixed(2);
  
  const stripe = stripeService.getInstance();
  const lineItems = await stripe.getCheckoutSessionLineItems(session.id);

  let itemsHtml = '<ul style="list-style-type: none; padding: 0;">';
  lineItems.data.forEach((item: Stripe.LineItem) => {
    itemsHtml += `<li style="margin-bottom: 10px;">${item.quantity}x - ${item.description}</li>`;
  });
  itemsHtml += '</ul>';

  const title = `¡Gracias por tu pedido, ${customerName}!`;
  const content = `
    <p>Hemos recibido tu pedido y ya lo estamos procesando. Aquí tienes un resumen:</p>
    ${itemsHtml}
    <p style="font-size: 18px; font-weight: bold;">Total: ${orderTotal}€</p>
    <p>Recibirás otra notificación tan pronto como tu pedido sea enviado.</p>
    <p>Gracias por confiar en la sabiduría de barra de bar,</p>
    <p><strong>El equipo de Cuñadismo Ilustrado</strong></p>
  `;

  const html = generateEmailTemplate(title, content);
  await sendEmail({ to: customerEmail, subject: `✅ ¡Confirmación de tu pedido en Cuñadismo Ilustrado!`, html });
  console.log(`Email de confirmación de pedido enviado a ${customerEmail}`);
}

// --- Email de Pedido Enviado ---
export async function sendShippingConfirmationEmail(shipmentData: any, customerEmail: string, customerName: string) {
  const trackingNumber = shipmentData.carrier.tracking_number;
  const trackingUrl = shipmentData.carrier.tracking_url;

  const title = '¡Tu pedido ya está en camino!';
  const content = `
    <p>Hola ${customerName},</p>
    <p>¡Buenas noticias! Tu pedido está en manos del transportista y va de camino.</p>
    <p>Puedes seguir tu paquete usando el siguiente enlace:</p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 15px 0;">
          <a href="${trackingUrl}" style="background-color: #eab308; color: #1a202c; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Seguir mi envío
          </a>
        </td>
      </tr>
    </table>
    <p style="text-align: center; font-size: 14px;">Nº de seguimiento: ${trackingNumber}</p>
    <p>¡Esperamos que disfrutes de tu dosis de sabiduría ilustrada!</p>
    <p><strong>El equipo de Cuñadismo Ilustrado</strong></p>
  `;

  const html = generateEmailTemplate(title, content);
  await sendEmail({ to: customerEmail, subject: `🚚 ¡Tu pedido está en camino, ${customerName}!`, html });
  console.log(`Email de envío de pedido enviado a ${customerEmail}`);
}

// --- Email de Pedido Entregado ---
export async function sendDeliveryConfirmationEmail(deliveryData: any, customerEmail: string, customerName: string) {
  const title = '¡Tu pedido ha sido entregado!';
  const content = `
    <p>Hola ${customerName},</p>
    <p>El transportista nos ha confirmado que tu paquete ha sido entregado. ¡Esperamos que te encante!</p>
    <p>Nos ayudaría muchísimo si pudieras dejarnos una reseña en nuestra web o redes sociales. ¡Tu opinión es oro!</p>
    <p>Gracias por tu compra,</p>
    <p><strong>El equipo de Cuñadismo Ilustrado</strong></p>
  `;

  const html = generateEmailTemplate(title, content);
  await sendEmail({ to: customerEmail, subject: `🎉 ¡Tu pedido ha sido entregado, ${customerName}!`, html });
  console.log(`Email de pedido entregado enviado a ${customerEmail}`);
}