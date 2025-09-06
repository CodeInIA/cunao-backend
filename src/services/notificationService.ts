// src/services/notificationService.ts


import Stripe from 'stripe';
import { sendEmail } from './emailService.js';
import stripeService from './stripeService.js';
import printifyService from './printifyService.js';
import { db } from './databaseService.js';

// --- PLANTILLA PRINCIPAL DE EMAIL MEJORADA ---
const generateEmailTemplate = (title: string, content: string): string => {
  const LOGO_URL = 'https://i.imgur.com/kxtvDwW.png'; // Logo sin letras
  const WEBSITE_URL = process.env.FRONTEND_URL || 'https://www.cunadismoilustrado.me';

  // Paleta de colores de tu marca
  const bgColor = '#1E293B'; // Azul oscuro/grisáceo de fondo
  const contentBgColor = '#0F172A'; // Azul casi negro para el contenido
  const textColor = '#E2E8F0'; // Texto principal (blanco roto)
  const accentColor = '#FBBF24'; // Amarillo/dorado para botones y detalles
  const secondaryTextColor = '#FFFFFF'; // Blanco para texto secundario

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700&family=Lato:wght@400;700&display=swap');
        body { font-family: 'Lato', Arial, sans-serif; }
        h1, h2, h3 { font-family: 'Merriweather', 'Georgia', serif; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: 'Lato', Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 40px 10px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; border-collapse: collapse; background-color: ${contentBgColor}; border-radius: 8px; overflow: hidden; border: 1px solid #334155;">
              <tr>
                <td align="center" style="padding: 40px 0 20px 0;">
                  <a href="${WEBSITE_URL}" style="text-decoration: none;">
                    <img src="${LOGO_URL}" alt="Cuñadismo Ilustrado Logo" width="100" style="display: block; margin: 0 auto;" />
                    <div style="margin-top: 15px;">
                      <span style="font-family: 'Merriweather', 'Georgia', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; letter-spacing: 1px;">Cuñadismo</span>
                      <span style="font-family: 'Merriweather', 'Georgia', serif; font-size: 28px; font-weight: 700; color: ${accentColor}; letter-spacing: 1px;">Ilustrado</span>
                    </div>
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; color: ${textColor}; font-size: 16px; line-height: 1.6;">
                  <h1 style="color: ${textColor}; font-family: 'Merriweather', 'Georgia', serif;">${title}</h1>
                  ${content}
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 30px 40px; font-size: 12px; line-height: 1.5; color: ${secondaryTextColor}; border-top: 1px solid #334155;">
                  <p>&copy; ${new Date().getFullYear()} Cuñadismo Ilustrado. Todos los derechos reservados.</p>
                  <p><a href="${WEBSITE_URL}" style="color: ${accentColor}; text-decoration: none; font-weight: bold;">Visita nuestra tienda</a></p>
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
  
  // Calcular subtotal
  const subtotal = (session.amount_subtotal / 100).toFixed(2);
  const subtotalValue = parseFloat(subtotal);
  
  // Obtener información del descuento desde metadata
  const discountCode = session.metadata?.discount_code || '';
  const discountPercentage = session.metadata?.discount_percentage || '';
  
  const stripe = stripeService.getInstance();
  
  // Calcular el subtotal original (antes del descuento) para determinar el envío
  let originalSubtotal = subtotalValue;
  let discountAmount = 0;
  
  if (discountCode && discountPercentage) {
    // Obtener información detallada de la sesión incluyendo descuentos
    const detailedSession = await stripe.getCheckoutSession(session.id);
    
    if (detailedSession.total_details?.amount_discount) {
      discountAmount = detailedSession.total_details.amount_discount / 100;
      // El subtotal original es el subtotal actual + el descuento aplicado
      originalSubtotal = subtotalValue + discountAmount;
    }
  }
  
  // Determinar si es envío gratuito basado en el subtotal ORIGINAL (antes del descuento)
  const freeShippingThreshold = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || '85');
  const isFreeShipping = originalSubtotal >= freeShippingThreshold;
  
  // Calcular costo de envío real
  let shippingCost = '0';
  if (!isFreeShipping) {
    // Obtener el costo de envío de las variables de entorno según la región
    const shippingRegion = session.metadata?.shipping_region || 'spain';
    if (shippingRegion === 'spain') {
      shippingCost = parseFloat(process.env.SHIPPING_COST_SPAIN || '6.99').toFixed(2);
    } else if (shippingRegion === 'europa') {
      shippingCost = parseFloat(process.env.SHIPPING_COST_EUROPA || '12.99').toFixed(2);
    }
  }
  const lineItems = await stripe.getCheckoutSessionLineItems(session.id);

  // Recuperar el pedido temporal usando client_reference_id
  const orderId = session.client_reference_id;
  const order = await db.findOrderByIdAndUpdate(orderId, {});

  let itemsHtml = '<div style="border-top: 1px solid #334155; margin-top: 20px; padding-top: 20px;">';
  if (order && order.lineItems) {
    for (const item of order.lineItems) {
      let imageUrl = '';
      if (item.productId && item.variantId) {
        try {
          const printify = printifyService.getInstance();
          const product = await printify.getProduct(item.productId);
          if (product && product.variants && Array.isArray(product.variants)) {
            // Buscar la imagen asociada a la variante
            if (product.images && Array.isArray(product.images)) {
              const img = product.images.find((img: any) => img.variant_ids && img.variant_ids.includes(item.variantId));
              if (img && img.src) {
                imageUrl = img.src;
              } else if (product.images.length > 0) {
                imageUrl = product.images[0].src;
              }
            }
          }
        } catch (err) {
          imageUrl = '';
        }
      }
      itemsHtml += `
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <img src="${imageUrl}" alt="${item.title}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px; margin-right: 16px; border: 1px solid #e8d7c2;" />
          <div>
            <strong>${item.quantity}x</strong> ${item.title} <span style="color: #FFFFFF;">(${item.size} / ${item.color})</span><br/>
            <span style="font-weight: bold; color: #FBBF24;">${item.price.toFixed(2)}€</span>
          </div>
        </div>
      `;
    }
  } else {
    // Fallback: Stripe lineItems
    lineItems.data.forEach((item: Stripe.LineItem) => {
      itemsHtml += `<p style="margin: 0 0 10px 0;"><strong>${item.quantity}x</strong> - ${item.description}</p>`;
    });
  }
  itemsHtml += '</div>';

  // Calcular el descuento aplicado si existe
  let discountSection = '';
  if (discountCode && discountAmount > 0) {
    discountSection = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #E2E8F0;">Código de descuento (${discountCode}):</span>
        <span style="color: #10B981;">-${discountAmount.toFixed(2)}€</span>
      </div>`;
  }

  // Desglose de precios
  const priceBreakdown = `
    <div style="border-top: 1px solid #334155; margin-top: 20px; padding-top: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #E2E8F0;">Subtotal:</span>
        <span style="color: #E2E8F0;">${subtotal}€</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #E2E8F0;">Envío:</span>
        <span style="color: #E2E8F0;">${parseFloat(shippingCost) === 0 ? 'GRATIS' : shippingCost + '€'}</span>
      </div>
      ${discountSection}
      <hr style="border: none; border-top: 1px solid #475569; margin: 12px 0;">
      <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
        <span style="color: #FFFFFF;">Total:</span>
        <span style="color: #FBBF24;">${orderTotal}€</span>
      </div>
    </div>
  `;

  const title = `¡Gracias por tu pedido, ${customerName}!`;
  const content = `
    <p style="color: #FFFFFF;">Hemos recibido tu pedido y ya lo estamos procesando. Aquí tienes un resumen:</p>
    ${itemsHtml}
    ${priceBreakdown}
    <p style="background-color: #2d3748; border: 1px solid #475569; padding: 15px; border-radius: 5px; text-align: center; font-size: 14px; color: #FFFFFF;">
      Recibirás un segundo correo con la información de seguimiento tan pronto como tu pedido sea enviado.
    </p>
    <p style="color: #FFFFFF;">Gracias por confiar en la sabiduría de barra de bar,</p>
    <p style="color: #FFFFFF;"><strong>El equipo de Cuñadismo Ilustrado</strong></p>
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
    <p>¡Buenas noticias! Tu pedido está en manos del transportista y va de camino. Puedes seguir tu paquete usando el siguiente enlace:</p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 20px 0;">
          <a href="${trackingUrl}" style="background-color: #FBBF24; color: #0F172A; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-family: 'Lato', Arial, sans-serif;">
            Seguir mi envío
          </a>
        </td>
      </tr>
    </table>
    <p style="text-align: center; font-size: 14px; color: #FFFFFF;">Nº de seguimiento: ${trackingNumber}</p>
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