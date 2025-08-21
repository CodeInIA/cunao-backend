import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import printifyServiceModule from '../services/printifyService.js';
import stripeServiceModule from '../services/stripeService.js';
import { db } from '../services/databaseService.js';
import { 
  CheckoutRequest, 
  OrderRequest, 
  ApiResponse, 
  ShippingAddress,
  CartItem,
  PrintifyVariant,
  ProductImage,
  ProductOption,
  OptionValue } from '../types/index.js';

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
    return res.status(400).json({ success: false, error: 'El carrito está vacío' });
  }
  if (!shippingRegion) {
    return res.status(400).json({ success: false, error: 'La región de envío es obligatoria' });
  }

  const printifyService = printifyServiceModule.getInstance();
  const productPromises = items.map((item: CartItem) => printifyService.getProduct(item.productId));
  const printifyProducts = await Promise.all(productPromises);

  const secureItems = items.map((item: CartItem, index: number) => {
    const product = printifyProducts[index];
    if (!product) throw new Error(`Producto con ID ${item.productId} no encontrado.`);
    
    const variant = product.variants.find((v: PrintifyVariant) => v.id === item.variantId);
    
    // --- INICIO DE LA CORRECIÓN ---
    // Añadimos una comprobación de seguridad para la variante y su ID
    if (!variant || typeof variant.id === 'undefined') {
      throw new Error(`Variante con ID ${item.variantId} no válida o sin ID para el producto ${item.productId}.`);
    }
    // --- FIN DE LA CORRECIÓN ---
    
    const mainImage = product.images.find((img: ProductImage) => img.is_default) || product.images[0];
    const sizeOption = product.options.find((opt: ProductOption) => opt.type === 'size');
    const colorOption = product.options.find((opt: ProductOption) => opt.type === 'color');
    const size = sizeOption?.values.find((val: OptionValue) => variant.options.includes(val.id))?.title || '';
    const color = colorOption?.values.find((val: OptionValue) => variant.options.includes(val.id))?.title || '';

    return {
      productId: product.id,
      variantId: variant.id,
      quantity: item.quantity,
      title: product.title,
      price: variant.price / 100,
      image: mainImage?.src || '',
      size,
      color,
    };
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const successUrl = `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${frontendUrl}/cart`;

  const lineItemsForStripe = secureItems.map((item: {
    productId: string;
    variantId: number;
    quantity: number;
    title: string;
    price: number;
    image: string;
    size: string;
    color: string;
  }) => ({
    price_data: {
      currency: 'eur',
      product_data: {
        name: item.title,
        images: [item.image],
        metadata: {
          productId: item.productId,
          variantId: item.variantId.toString(),
          size: item.size,
          color: item.color
        }
      },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity
  }));
  
  const metadataForSession = {
    items: JSON.stringify(secureItems),
    shippingRegion: shippingRegion
  };

  const stripeService = stripeServiceModule.getInstance();
  const session = await stripeService.createCheckoutSession(
    lineItemsForStripe,
    successUrl,
    cancelUrl,
    metadataForSession,
    shippingRegion
  );

  res.status(200).json({
    success: true,
    data: { checkout_url: session.url, session_id: session.id }
  });
});

// Procesar pedido después del pago exitoso
export const processOrder = asyncHandler(async (req: Request, res: Response) => {
  const { session_id } = req.body;
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'Se requiere session_id' });
  }

  try {
    const stripeService = stripeServiceModule.getInstance();
    const session = await stripeService.getCheckoutSession(session_id);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, error: 'El pago no ha sido completado' });
    }

    // --- INICIO DE LA CORRECCIÓN BASADA EN TU CAPTURA ---
    // Accedemos a los detalles del cliente, que contienen la dirección
    const customerDetails = session.customer_details;

    // Verificamos que tanto los detalles del cliente como la dirección existen
    if (!customerDetails || !customerDetails.address) {
      throw new Error('No se encontraron los detalles de envío del cliente en la sesión de Stripe.');
    }
    const shippingAddress = customerDetails.address;
    // --- FIN DE LA CORRECCIÓN ---
    
    const items = JSON.parse(session.metadata?.items || '[]');
    
    const orderData: OrderRequest = {
      external_id: session.id,
      line_items: items.map((item: { productId: string; variantId: number; quantity: number }) => ({
        product_id: item.productId,
        variant_id: item.variantId,
        quantity: item.quantity
      })),
      shipping_method: 1,
      is_printify_express: false,
      send_shipping_notification: true,
      address_to: {
        first_name: customerDetails.name?.split(' ')[0] || '',
        last_name: customerDetails.name?.split(' ').slice(1).join(' ') || '',
        email: customerDetails.email || '',
        phone: customerDetails.phone || '',
        country: shippingAddress.country || '',
        region: shippingAddress.state || '',
        address1: shippingAddress.line1 || '',
        address2: shippingAddress.line2 || '',
        city: shippingAddress.city || '',
        zip: shippingAddress.postal_code || ''
      }
    };

    const printifyService = printifyServiceModule.getInstance();
    const printifyOrder = await printifyService.createOrder(orderData);
    
    await db.findOrderByStripeIdAndUpdate(session.id, {
      printifyOrderId: printifyOrder.id,
      status: 'processing'
    });

    const autoSubmit = process.env.PRINTIFY_AUTO_SUBMIT_TO_PRODUCTION === 'true';
    if (autoSubmit) {
      await printifyService.submitOrderToProduction(printifyOrder.id);
    }
    
    res.status(200).json({
      success: true,
      data: { order_id: printifyOrder.id, status: printifyOrder.status },
      message: `Pedido procesado. Envío a producción: ${autoSubmit}`
    });
    
  } catch (error: any) {
    console.error('Error al procesar pedido:', error);
    res.status(500).json({ success: false, error: 'Error al procesar el pedido: ' + error.message });
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

  const line_items = items.map((item: { productId: string; variantId: number; quantity: number }) => ({
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
