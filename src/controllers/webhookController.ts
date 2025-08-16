import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import stripeServiceModule from '../services/stripeService';
import printifyServiceModule from '../services/printifyService';

// Webhook de Stripe para manejar eventos de pago
export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).json({
      success: false,
      error: 'Falta la firma del webhook'
    });
  }

  try {
    const stripeService = stripeServiceModule.getInstance();
    const event = stripeService.verifyWebhookSignature(req.body, signature);
    
    console.log('Evento de Stripe recibido:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    res.status(200).json({ received: true });
    
  } catch (error: any) {
    console.error('Error al procesar webhook de Stripe:', error);
    res.status(400).json({
      success: false,
      error: 'Error al verificar webhook: ' + error.message
    });
  }
});

// Manejar checkout completado
async function handleCheckoutCompleted(session: any) {
  console.log('Checkout completado:', session.id);
  
  try {
    // Aquí podrías implementar lógica adicional como:
    // - Enviar email de confirmación
    // - Actualizar inventario
    // - Notificaciones automáticas
    
    // El procesamiento del pedido se hace desde el frontend
    // cuando el usuario es redirigido a la página de éxito
    
  } catch (error) {
    console.error('Error al procesar checkout completado:', error);
  }
}

// Manejar pago exitoso
async function handlePaymentSucceeded(paymentIntent: any) {
  console.log('Pago exitoso:', paymentIntent.id);
  
  try {
    // Lógica adicional para pagos exitosos
    // Por ejemplo, enviar notificación al equipo
    
  } catch (error) {
    console.error('Error al procesar pago exitoso:', error);
  }
}

// Manejar pago fallido
async function handlePaymentFailed(paymentIntent: any) {
  console.log('Pago fallido:', paymentIntent.id);
  
  try {
    // Lógica para manejar pagos fallidos
    // Por ejemplo, notificar al customer service
    
  } catch (error) {
    console.error('Error al procesar pago fallido:', error);
  }
}

// Webhook de Printify para actualizaciones de pedidos
export const handlePrintifyWebhook = asyncHandler(async (req: Request, res: Response) => {
  const event = req.body;
  
  console.log('Evento de Printify recibido:', event.type);
  
  try {
    switch (event.type) {
      case 'order:created':
        await handleOrderCreated(event.resource);
        break;
        
      case 'order:updated':
        await handleOrderUpdated(event.resource);
        break;
        
      case 'order:sent-to-production':
        await handleOrderSentToProduction(event.resource);
        break;
        
      case 'order:shipment:created':
        await handleShipmentCreated(event.resource);
        break;
        
      case 'order:shipment:delivered':
        await handleShipmentDelivered(event.resource);
        break;
        
      default:
        console.log(`Evento de Printify no manejado: ${event.type}`);
    }

    res.status(200).json({ received: true });
    
  } catch (error: any) {
    console.error('Error al procesar webhook de Printify:', error);
    res.status(400).json({
      success: false,
      error: 'Error al procesar webhook: ' + error.message
    });
  }
});

// Manejar creación de pedido
async function handleOrderCreated(order: any) {
  console.log('Pedido creado en Printify:', order.id);
  
  // Aquí podrías implementar:
  // - Guardar en base de datos local
  // - Enviar confirmación por email
  // - Notificar al equipo
}

// Manejar actualización de pedido
async function handleOrderUpdated(order: any) {
  console.log('Pedido actualizado en Printify:', order.id);
  
  // Actualizar estado local del pedido
}

// Manejar envío a producción
async function handleOrderSentToProduction(order: any) {
  console.log('Pedido enviado a producción:', order.id);
  
  // Notificar al cliente que su pedido está en producción
}

// Manejar creación de envío
async function handleShipmentCreated(shipment: any) {
  console.log('Envío creado:', shipment.id);
  
  // Enviar información de tracking al cliente
}

// Manejar entrega de envío
async function handleShipmentDelivered(shipment: any) {
  console.log('Envío entregado:', shipment.id);
  
  // Enviar confirmación de entrega
  // Solicitar reseña del producto
}
