import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import printifyServiceModule from '../services/printifyService';
import stripeServiceModule from '../services/stripeService';
import { CheckoutRequest, OrderRequest, ApiResponse, ShippingAddress } from '../types/index';

// Función de ayuda para validar la dirección
const validateShippingAddress = (address: ShippingAddress, region: string): boolean => {
  switch (region) {
    case 'spain':
      return address.country === 'ES';
    case 'europa':
      // Stripe ya valida la lista de países, pero esta es una doble comprobación.
      return address.country !== 'ES';
    default:
      return false;
  }
};

// Crear Payment Intent para checkout
export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  const { items, shipping_address }: CheckoutRequest = req.body;
  
  if (!items || !items.length) {
    return res.status(400).json({
      success: false,
      error: 'El carrito está vacío'
    });
  }

  // Calcular total del carrito
  const stripeService = stripeServiceModule.getInstance();
  const total = stripeService.calculateCartTotal(items);
  
  // Obtener costos de envío de Printify
  const line_items = items.map(item => ({
    product_id: item.productId,
    variant_id: item.variantId,
    quantity: item.quantity
  }));

  let shippingCost = 0;
  try {
    const printifyService = printifyServiceModule.getInstance();
    const shippingOptions = await printifyService.getShippingCosts(line_items, shipping_address);
    if (shippingOptions.length > 0) {
      shippingCost = shippingOptions[0].cost / 100; // Convertir de céntimos
    }
  } catch (error) {
    console.warn('No se pudieron obtener costos de envío, usando valor por defecto');
    shippingCost = 5.99; // Costo por defecto
  }

  const totalWithShipping = total + shippingCost;

  // Crear Payment Intent en Stripe
  const paymentIntent = await stripeService.createPaymentIntent(
    totalWithShipping,
    'eur',
    {
      items: JSON.stringify(items),
      shipping_address: JSON.stringify(shipping_address),
      shipping_cost: shippingCost.toString()
    }
  );

  const response: ApiResponse<any> = {
    success: true,
    data: {
      client_secret: paymentIntent.client_secret,
      total: totalWithShipping,
      shipping_cost: shippingCost,
      items_total: total
    }
  };

  res.status(200).json(response);
});

// Crear sesión de checkout
export const createCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
  const { items, shippingRegion } = req.body;
  
  if (!items || !items.length) {
    return res.status(400).json({
      success: false,
      error: 'El carrito está vacío'
    });
  }

  if (!shippingRegion) {
    return res.status(400).json({
      success: false,
      error: 'La región de envío es obligatoria'
    });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const successUrl = `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${frontendUrl}/cart`;

  // Simplificar los items para los metadatos y evitar superar el límite de 500 caracteres.
  const itemsForMetadata = items.map((item: any) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
  }));

  const stripeService = stripeServiceModule.getInstance();
  const session = await stripeService.createCheckoutSession(
    items,
    successUrl,
    cancelUrl,
    {
      items: JSON.stringify(itemsForMetadata) // Usar la versión simplificada
    },
    shippingRegion // Pasar la región al servicio de Stripe
  );

  const response: ApiResponse<any> = {
    success: true,
    data: {
      checkout_url: session.url,
      session_id: session.id
    }
  };

  res.status(200).json(response);
});

// Procesar pedido después del pago exitoso
export const processOrder = asyncHandler(async (req: Request, res: Response) => {
  const { payment_intent_id, session_id } = req.body;
  
  try {
    let orderData: any;
    
    if (session_id) {
      // Obtener información de la sesión de Stripe
      const stripeService = stripeServiceModule.getInstance();
      const session = await stripeService.getCheckoutSession(session_id);
      
      if (session.payment_status !== 'paid') {
        return res.status(400).json({
          success: false,
          error: 'El pago no ha sido completado'
        });
      }

      // Extraer datos del pedido de los metadatos
      const items = JSON.parse(session.metadata?.items || '[]');
      
      orderData = {
        external_id: session.id,
        line_items: items.map((item: any) => ({
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity
        })),
        shipping_method: 1, // Método por defecto
        is_printify_express: false,
        send_shipping_notification: true,
        address_to: {
          first_name: session.customer_details?.name?.split(' ')[0] || '',
          last_name: session.customer_details?.name?.split(' ').slice(1).join(' ') || '',
          email: session.customer_details?.email || '',
          phone: session.customer_details?.phone || '',
          country: session.customer_details?.address?.country || 'ES',
          region: session.customer_details?.address?.state || '',
          address1: session.customer_details?.address?.line1 || '',
          address2: session.customer_details?.address?.line2 || '',
          city: session.customer_details?.address?.city || '',
          zip: session.customer_details?.address?.postal_code || ''
        }
      };
    } else if (payment_intent_id) {
      // Verificar el Payment Intent
      const stripeService = stripeServiceModule.getInstance();
      const paymentIntent = await stripeService.confirmPayment(payment_intent_id);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          error: 'El pago no ha sido completado'
        });
      }

      // Extraer datos del pedido de los metadatos
      const items = JSON.parse(paymentIntent.metadata.items || '[]');
      const shippingAddress = JSON.parse(paymentIntent.metadata.shipping_address || '{}');
      
      orderData = {
        external_id: paymentIntent.id,
        line_items: items.map((item: any) => ({
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity
        })),
        shipping_method: 1,
        is_printify_express: false,
        send_shipping_notification: true,
        address_to: shippingAddress
      };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Se requiere payment_intent_id o session_id'
      });
    }

    // Crear pedido en Printify
    const printifyService = printifyServiceModule.getInstance();
    const printifyOrder = await printifyService.createOrder(orderData);
    
    // Enviar pedido a producción automáticamente solo si está activado
    const autoSubmit = process.env.PRINTIFY_AUTO_SUBMIT_TO_PRODUCTION === 'true';
    let productionResult = { submitted: false };

    if (autoSubmit) {
      const result = await printifyService.submitOrderToProduction(printifyOrder.id);
      productionResult.submitted = result;
    }
    
    const response: ApiResponse<any> = {
      success: true,
      data: {
        order_id: printifyOrder.id,
        external_id: printifyOrder.external_id,
        status: printifyOrder.status,
        sent_to_production: productionResult.submitted
      },
      message: `Pedido procesado exitosamente. Envío a producción: ${autoSubmit}`
    };

    res.status(200).json(response);
    
  } catch (error: any) {
    console.error('Error al procesar pedido:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar el pedido: ' + error.message
    });
  }
});

// Obtener estado de un pedido
export const getOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  
  const printifyService = printifyServiceModule.getInstance();
  const order = await printifyService.getOrder(orderId);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Pedido no encontrado'
    });
  }

  const response: ApiResponse<any> = {
    success: true,
    data: {
      id: order.id,
      external_id: order.external_id,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      shipments: order.shipments
    }
  };

  res.status(200).json(response);
});

// Calcular costos de envío
export const calculateShipping = asyncHandler(async (req: Request, res: Response) => {
  const { items, address } = req.body;
  
  if (!items || !items.length) {
    return res.status(400).json({
      success: false,
      error: 'Se requieren artículos para calcular envío'
    });
  }

  const line_items = items.map((item: any) => ({
    product_id: item.productId,
    variant_id: item.variantId,
    quantity: item.quantity
  }));

  const printifyService = printifyServiceModule.getInstance();
  const shippingOptions = await printifyService.getShippingCosts(line_items, address);
  
  const response: ApiResponse<any> = {
    success: true,
    data: shippingOptions,
    message: `${shippingOptions.length} opciones de envío disponibles`
  };

  res.status(200).json(response);
});
