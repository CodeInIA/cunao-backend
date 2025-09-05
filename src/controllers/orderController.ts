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
  const { items, shippingRegion, emailMarketing } = req.body;
  
  if (!items || !items.length) {
    return res.status(400).json({ success: false, error: 'El carrito está vacío' });
  }
  if (!shippingRegion) {
    return res.status(400).json({ success: false, error: 'La región de envío es obligatoria' });
  }


  // Guardar el carrito y la región en la base de datos antes de crear la sesión de Stripe
  // Obtener los datos completos de los productos antes de guardar el pedido temporal
  const printifyServiceTemp = printifyServiceModule.getInstance();
  const productPromisesTemp = items.map((item: CartItem) => printifyServiceTemp.getProduct(item.productId));
  const printifyProductsTemp = await Promise.all(productPromisesTemp);
  const secureItemsTemp = items.map((item: CartItem, index: number) => {
    const product = printifyProductsTemp[index];
    if (!product) throw new Error(`Producto con ID ${item.productId} no encontrado.`);
    const variant = product.variants.find((v: PrintifyVariant) => v.id === item.variantId);
    if (!variant || typeof variant.id === 'undefined') {
      throw new Error(`Variante con ID ${item.variantId} no válida o sin ID para el producto ${item.productId}.`);
    }
    const sizeOption = product.options.find((opt: ProductOption) => opt.type === 'size');
    const colorOption = product.options.find((opt: ProductOption) => opt.type === 'color');
    const size = sizeOption?.values.find((val: OptionValue) => variant.options.includes(val.id))?.title || '';
    const color = colorOption?.values.find((val: OptionValue) => variant.options.includes(val.id))?.title || '';
    const variantImage = product.images.find((img: ProductImage) => img.variant_ids?.includes(variant.id));
    const mainImage = product.images.find((img: ProductImage) => img.is_default) || product.images[0];
    const imageToShow = variantImage?.src || mainImage?.src || '';
    return {
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      size,
      color,
      quantity: item.quantity,
      price: variant.price / 100,
      image: imageToShow
    };
  });

  const tempOrder = await db.saveOrder({
    stripeSessionId: '', // Se actualizará después
    customerEmail: '', // Se actualizará después
    customerName: '', // Se actualizará después
    lineItems: secureItemsTemp,
    shippingDetails: {
      address: '',
      city: '',
      postalCode: '',
      country: '',
      phone: ''
    },
    totalAmount: secureItemsTemp.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0),
    status: 'pending',
    region: shippingRegion
  });

  // Preparar los datos para Stripe
  const printifyService = printifyServiceModule.getInstance();
  const productPromises = items.map((item: CartItem) => printifyService.getProduct(item.productId));
  const printifyProducts = await Promise.all(productPromises);
  const secureItems = items.map((item: CartItem, index: number) => {
    const product = printifyProducts[index];
    if (!product) throw new Error(`Producto con ID ${item.productId} no encontrado.`);
    const variant = product.variants.find((v: PrintifyVariant) => v.id === item.variantId);
    if (!variant || typeof variant.id === 'undefined') {
      throw new Error(`Variante con ID ${item.variantId} no válida o sin ID para el producto ${item.productId}.`);
    }
    const sizeOption = product.options.find((opt: ProductOption) => opt.type === 'size');
    const size = sizeOption?.values.find((val: OptionValue) => variant.options.includes(val.id))?.title || '';
    const mainImage = product.images.find((img: ProductImage) => img.is_default) || product.images[0];
    const variantImage = product.images.find((img: ProductImage) => img.variant_ids?.includes(variant.id));
    const imageToShow = variantImage?.src || mainImage?.src || '';
    return {
      productId: product.id,
      variantId: variant.id,
      quantity: item.quantity,
      title: product.title,
      price: variant.price / 100,
      image: imageToShow,
      size,
      color: item.color || '',
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
        name: `${item.title} - Talla ${item.size}`,
        images: [item.image]
      },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity
  }));
  
  // Usar solo el ID del pedido en client_reference_id
  const stripeService = stripeServiceModule.getInstance();
  // Tipar el _id correctamente
  // Usar el ID temporal del pedido como client_reference_id
  const tempOrderId = tempOrder?._id ? String(tempOrder._id) : '';
  const session = await stripeService.createCheckoutSession(
    lineItemsForStripe,
    successUrl,
    cancelUrl,
    { 
      email_marketing: emailMarketing ? 'true' : 'false'
    }, // Metadata con preferencia de email marketing
    {
      shippingRegion,
      client_reference_id: tempOrderId
    }
  );

  // Actualizar el pedido temporal con el sessionId de Stripe
  await db.findOrderByStripeIdAndUpdate(session.id, { stripeSessionId: session.id });

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
    
    // Recuperar el pedido temporal usando el client_reference_id
    const orderId = session.client_reference_id;
    if (!orderId) {
      throw new Error('No se recibió client_reference_id en la sesión de Stripe.');
    }
    let order = await db.findOrderByIdAndUpdate(orderId, {
      stripeSessionId: session.id,
      customerEmail: customerDetails.email || '',
      customerName: customerDetails.name || '',
      shippingDetails: {
        address: shippingAddress.line1 || '',
        city: shippingAddress.city || '',
        postalCode: shippingAddress.postal_code || '',
        country: shippingAddress.country || '',
        phone: customerDetails.phone || ''
      },
      totalAmount: session.amount_total ? session.amount_total / 100 : 0,
      status: 'processing'
    });
    if (!order) {
      throw new Error('No se encontró el pedido temporal en la base de datos por client_reference_id.');
    }

    // Validar que el pedido tiene productos
    if (!order.lineItems || !Array.isArray(order.lineItems) || order.lineItems.length === 0) {
      throw new Error('El pedido no tiene productos para enviar a Printify.');
    }

    const orderData: OrderRequest = {
      external_id: session.id,
      line_items: order.lineItems.map((item: any) => ({
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
