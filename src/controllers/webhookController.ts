import crypto from 'crypto';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../middleware/errorHandler.js';
import stripeServiceModule from '../services/stripeService.js';
import printifyServiceModule from '../services/printifyService.js';
import imageServiceModule from '../services/imageService.js';
import * as notificationService from '../services/notificationService.js';
import { db } from '../services/databaseService.js';
import { PrintifyProduct } from '../types/index.js';
import Client from '../models/Client.js';
import Newsletter from '../models/Newsletter.js';

// --- Función slugify ---
function slugify(text: string): string {
    if (!text) return '';
    return text.toString().toLowerCase().replace(/ñ/g, 'n').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

// --- Validación de Firma de Printify ---
function validatePrintifySignature(req: Request): boolean {
  const signature = req.headers['x-pfy-signature'] as string;
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!signature || !secret) {
    console.error('Falta la firma o el secreto para el webhook de Printify.');
    return false;
  }
  // Usar el buffer original
  const body = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const expectedSignature = `sha256=${hash}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

// --- Webhook de Stripe ---
export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    return res.status(400).json({ error: 'Falta la firma del webhook' });
  }

  try {
    const stripeService = stripeServiceModule.getInstance();
    const event = stripeService.verifyWebhookSignature(req.body, signature);
    
    console.log('Evento de Stripe recibido:', event.type);
    
    // Responde inmediatamente a Stripe
    res.status(200).json({ received: true });

    // Procesa el evento en segundo plano
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      // Puedes añadir más casos si los necesitas
      default:
        console.log(`Evento de Stripe no manejado: ${event.type}`);
    }
  } catch (error: any) {
    console.error('Error al procesar webhook de Stripe:', error);
    // No envíes una respuesta de error aquí, porque ya has enviado el 200 OK
  }
});

// --- Webhook de Printify ---
export const handlePrintifyWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (!validatePrintifySignature(req)) {
    return res.status(401).json({ error: 'Firma inválida' });
  }

  res.status(200).json({ received: true });

  const event = JSON.parse(req.body.toString('utf8'));
  console.log('Evento de Printify recibido y aceptado, procesando:', event.type);

  try {
    switch (event.type) {
      case 'product:publish:started':
        await handleProductPublishStarted(event.resource);
        break;
      case 'product:deleted':
        await handleProductDeleted(event.resource);
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
  } catch (error: any) {
    console.error(`Error procesando el evento '${event.type}' en segundo plano:`, error);
  }
});


// --- Lógica de Negocio (Helpers) ---

// Stripe
async function handleCheckoutCompleted(session: any) {
  console.log('Checkout completado:', session.id);

  // Usar client_reference_id para actualizar la orden existente (ahora es nuestro orderId personalizado)
  const orderId = session.client_reference_id;
  if (!orderId) {
    console.error('No se recibió client_reference_id en la sesión de Stripe.');
    return;
  }

  // Actualizar la orden existente usando el orderId personalizado
  const updatedOrder = await db.updateOrderByOrderId(orderId, {
    stripeSessionId: session.id,
    customerEmail: session.customer_details.email,
    customerName: session.customer_details.name,
    totalAmount: session.amount_total / 100,
    shippingDetails: {
      address: session.customer_details.address?.line1 || '',
      city: session.customer_details.address?.city || '',
      postalCode: session.customer_details.address?.postal_code || '',
      country: session.customer_details.address?.country || '',
      phone: session.customer_details.phone || '',
    },
    status: 'pending'
  });

  if (!updatedOrder) {
    console.error('No se encontró la orden en la base de datos para actualizar por orderId:', orderId);
    return;
  }

  // Guardar o actualizar datos del cliente
  try {
    const customerEmail = session.customer_details.email;
    const customerName = session.customer_details.name;
    const address = session.customer_details.address;
    const phone = session.customer_details.phone;
    
    // Obtener metadata de email marketing del session
    const emailMarketing = session.metadata?.email_marketing === 'true';
    
    // Buscar si ya existe el cliente
    let existingClient = await Client.findOne({ email: customerEmail });

    if (existingClient) {
      // Actualizar cliente existente
      existingClient.orderIds.push(orderId);
      
      // Una vez que emailMarketing sea true, se mantiene en true
      if (emailMarketing || existingClient.emailMarketing) {
        existingClient.emailMarketing = true;
      }
      
      // Si acepta email marketing o ya lo tenía activado, gestionar newsletter
      if (existingClient.emailMarketing && customerEmail) {
        try {
          // Buscar newsletter existente
          const existingNewsletter = await Newsletter.findOne({ email: customerEmail });
          if (!existingNewsletter) {
            // Crear nueva entrada en newsletter
            const newNewsletter = new Newsletter({ email: customerEmail });
            const savedNewsletter = await newNewsletter.save();
            existingClient.newsletterId = savedNewsletter._id as Types.ObjectId;
            console.log(`Cliente suscrito a newsletter: ${customerEmail}`);
          } else {
            // Usar newsletter existente
            existingClient.newsletterId = existingNewsletter._id as Types.ObjectId;
            console.log(`Cliente referenciado a newsletter existente: ${customerEmail}`);
          }
        } catch (newsletterError) {
          console.error('Error gestionando newsletter:', newsletterError);
        }
      }
      
      // Actualizar información de pago
      existingClient.paymentInfo.stripeCustomerId = session.customer || existingClient.paymentInfo.stripeCustomerId;
      existingClient.paymentInfo.lastPaymentMethod = session.payment_method_types?.[0] || existingClient.paymentInfo.lastPaymentMethod;
      
      await existingClient.save();
      console.log(`Cliente actualizado: ${customerEmail}`);
    } else {
      // Crear nuevo cliente
      let newsletterId: Types.ObjectId | undefined;
      
      // Si acepta email marketing, gestionar newsletter
      if (emailMarketing && customerEmail) {
        try {
          // Buscar newsletter existente
          const existingNewsletter = await Newsletter.findOne({ email: customerEmail });
          if (!existingNewsletter) {
            // Crear nueva entrada en newsletter
            const newNewsletter = new Newsletter({ email: customerEmail });
            const savedNewsletter = await newNewsletter.save();
            newsletterId = savedNewsletter._id as Types.ObjectId;
            console.log(`Cliente suscrito a newsletter: ${customerEmail}`);
          } else {
            // Usar newsletter existente
            newsletterId = existingNewsletter._id as Types.ObjectId;
            console.log(`Cliente referenciado a newsletter existente: ${customerEmail}`);
          }
        } catch (newsletterError) {
          console.error('Error gestionando newsletter:', newsletterError);
        }
      }
      
      const newClient = new Client({
        name: customerName || 'Cliente',
        email: customerEmail,
        phone: phone || '',
        address: {
          line1: address?.line1 || '',
          line2: address?.line2 || '',
          city: address?.city || '',
          state: address?.state || '',
          postal_code: address?.postal_code || '',
          country: address?.country || ''
        },
        paymentInfo: {
          stripeCustomerId: session.customer || '',
          lastPaymentMethod: session.payment_method_types?.[0] || ''
        },
        orderIds: [orderId],
        emailMarketing: emailMarketing,
        newsletterId: newsletterId || undefined
      });

      await newClient.save();
      console.log(`Nuevo cliente creado: ${customerEmail}`);
    }
  } catch (clientError) {
    console.error('Error guardando datos del cliente:', clientError);
  }

  // Enviar email de confirmación
  await notificationService.sendOrderConfirmationEmail(session);
}

// Printify
async function handleProductPublishStarted(resource: any) {
    const productId = resource?.id;
    if (!productId) {
        console.error('No se recibió ID del producto en el evento product:publish:started');
        return;
    }

    console.log(`Procesando publicación del producto: ${productId}`);

    try {
        const printifyService = printifyServiceModule.getInstance();
        const imageService = imageServiceModule.getInstance();
        
        // Verificar si el producto ya existe en la base de datos
        const existingProduct = await db.getProductByPrintifyId(productId);
        
        if (existingProduct) {
            console.log(`📋 Producto ${productId} ya existe en la base de datos`);
            
            // Verificar si las imágenes ya están optimizadas
            const hasOptimizedImages = existingProduct.images?.some((img: any) => img.cdnUrl);
            
            if (hasOptimizedImages) {
                console.log(`✅ Producto ${productId} ya tiene imágenes optimizadas, omitiendo reprocesamiento`);
                
                // Solo marcar como publicado si no lo está ya
                const slug = slugify(existingProduct.title);
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const handle = `${frontendUrl}/producto/${slug}`;
                await printifyService.setPublishSucceeded(productId, productId, handle);
                
                return;
            } else {
                console.log(`🔄 Producto ${productId} existe pero necesita optimización de imágenes`);
            }
        }
        
        // Hacer GET a la API de Printify para obtener la información completa del producto
        const fullProduct = await printifyService.getProduct(productId);
        
        if (!fullProduct) {
            console.error(`No se pudo obtener el producto ${productId} de Printify`);
            return;
        }

        console.log(`Producto ${productId} obtenido de Printify API:`, {
            title: fullProduct.title,
            imagesCount: fullProduct.images?.length || 0,
            variantsCount: fullProduct.variants?.length || 0
        });

        // Procesar todas las imágenes: convertir a WebP y subir a CDN
        let processedImages: any[] = [];
        if (fullProduct.images && fullProduct.images.length > 0) {
            console.log(`🖼️ Iniciando procesamiento de imágenes para producto ${productId}`);
            
            const imageResults = await imageService.processProductImages(productId, fullProduct.images);
            
            // Combinar datos originales con URLs de CDN
            processedImages = fullProduct.images.map((originalImage, index) => {
                const processedImage = imageResults.find(result => 
                    result.originalUrl === originalImage.src
                );
                
                if (processedImage) {
                    // Generar URLs de diferentes tamaños
                    const cdnUrls = imageService.generateImageUrls(processedImage.cdnUrl);
                    
                    return {
                        ...originalImage,
                        cdnUrl: processedImage.cdnUrl,
                        cdnPublicId: processedImage.publicId,
                        cdnUrls: cdnUrls
                    };
                } else {
                    // Si falla el procesamiento, mantener la imagen original
                    console.warn(`⚠️ No se pudo procesar la imagen ${originalImage.src}, manteniendo URL original`);
                    return originalImage;
                }
            });

            console.log(`✅ Procesamiento de imágenes completado: ${imageResults.length}/${fullProduct.images.length} imágenes optimizadas`);
        }

        // Crear el producto con las imágenes procesadas
        const productToSave = {
            ...fullProduct,
            images: processedImages
        };

        // Guardar el producto completo en MongoDB
        await db.saveOrUpdateProduct(productToSave);

        // Marcar como publicado en Printify
        const slug = slugify(fullProduct.title);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const handle = `${frontendUrl}/producto/${slug}`;

        await printifyService.setPublishSucceeded(productId, productId, handle);
        console.log(`Producto ${productId} guardado en DB y marcado como publicado: ${handle}`);

        // Agregar automáticamente a productos semanales para email de nuevos productos
        try {
            const { addWeeklyProduct } = await import('../cron/weeklyNewProducts.js');
            
            // Preparar datos del producto para la colección semanal
            const enabledVariants = fullProduct.variants?.filter((v: any) => v.is_enabled) || [];
            
            // Encontrar la imagen por defecto - priorizar CDN si está disponible
            const defaultImage = processedImages.find((img: any) => img.is_default) || processedImages[0];
            const imageUrl = defaultImage?.cdnUrls?.medium || defaultImage?.cdnUrl || defaultImage?.src || '';
            
            // Encontrar la variante que corresponde a la imagen por defecto
            let selectedVariant = enabledVariants[0]; // fallback
            if (defaultImage?.variant_ids && defaultImage.variant_ids.length > 0) {
                const imageVariantId = defaultImage.variant_ids[0];
                const imageVariant = enabledVariants.find((v: any) => v.id === imageVariantId);
                if (imageVariant) {
                    selectedVariant = imageVariant;
                }
            }
            
            // Usar el precio de la variante seleccionada o el precio mínimo como fallback
            const priceToUse = selectedVariant?.price || Math.min(...enabledVariants.map((v: any) => v.price || Infinity));
            
            const weeklyProductData = {
                productId: productId,
                title: fullProduct.title,
                description: fullProduct.description || '',
                imageUrl: imageUrl,
                price: priceToUse / 100, // Convertir de centavos a euros
                printifyProductId: productId,
                tags: fullProduct.tags || []
            };

            const addedToWeekly = await addWeeklyProduct(weeklyProductData);
            
            if (addedToWeekly) {
                console.log(`✅ Producto ${productId} agregado automáticamente a productos semanales`);
            } else {
                console.warn(`⚠️ No se pudo agregar el producto ${productId} a productos semanales`);
            }
        } catch (weeklyError) {
            console.error(`❌ Error agregando producto ${productId} a productos semanales:`, weeklyError);
        }
        
    } catch (error) {
        console.error(`Error al procesar la publicación del producto ${productId}:`, error);
        console.error('Stack trace:', error);
    }
}

async function handleProductDeleted(resource: any) {
    const productId = resource?.id;
    if (!productId) {
        console.error('No se recibió ID del producto en el evento product:deleted');
        return;
    }

    console.log(`Procesando eliminación del producto: ${productId}`);

    try {
        // Obtener el producto de la base de datos antes de eliminarlo para limpiar las imágenes de CDN
        const product = await db.getProductByPrintifyId(productId);
        
        if (product && product.images) {
            const imageService = imageServiceModule.getInstance();
            
            // Recopilar public_ids de Cloudinary para eliminar
            const publicIds: string[] = [];
            product.images.forEach((image: any) => {
                if (image.cdnPublicId) {
                    publicIds.push(image.cdnPublicId);
                }
            });

            // Eliminar imágenes de Cloudinary
            if (publicIds.length > 0) {
                console.log(`🗑️ Eliminando ${publicIds.length} imágenes de CDN para producto ${productId}`);
                await imageService.deleteImages(publicIds);
            }
        }

        // Eliminar el producto de la base de datos
        const deleted = await db.deleteProductByPrintifyId(productId);
        if (deleted) {
            console.log(`Producto ${productId} eliminado exitosamente de la base de datos`);
        } else {
            console.log(`El producto ${productId} no se encontró en la base de datos`);
        }
    } catch (error) {
        console.error(`Error al eliminar el producto ${productId}:`, error);
    }
}

async function handleShipmentCreated(resource: any) {
  const printifyOrderId = resource.id;
  console.log('Envío creado para el pedido de Printify:', printifyOrderId);
  
  const orderInDb = await db.findOrderByPrintifyId(printifyOrderId);

  if (orderInDb && orderInDb.customerEmail && orderInDb.customerName) {
    await db.updateOrderByPrintifyId(printifyOrderId, {
      status: 'shipped',
      trackingNumber: resource.data.carrier.tracking_number,
      trackingUrl: resource.data.carrier.tracking_url
    });
    // CAMBIO: Pasamos el ID de Printify y el nombre del cliente a la función de notificación
    const firstName = orderInDb.customerName.split(' ')[0];
    await notificationService.sendShippingConfirmationEmail(resource.data, orderInDb.customerEmail, firstName, printifyOrderId);
  } else {
    console.error(`No se encontró el pedido o los datos del cliente ${printifyOrderId} en la BD.`);
  }
}

async function handleShipmentDelivered(resource: any) {
  const printifyOrderId = resource.id;
  console.log('Envío entregado para el pedido de Printify:', printifyOrderId);
  
  const orderInDb = await db.findOrderByPrintifyId(printifyOrderId);

  if (orderInDb && orderInDb.customerEmail && orderInDb.customerName) {
    await db.updateOrderByPrintifyId(printifyOrderId, {
      status: 'delivered'
    });
    // CAMBIO: Pasamos el ID de Printify y el nombre del cliente a la función de notificación
    const firstName = orderInDb.customerName.split(' ')[0];
    await notificationService.sendDeliveryConfirmationEmail(resource.data, orderInDb.customerEmail, firstName, printifyOrderId);
  } else {
    console.error(`No se encontró el pedido o los datos del cliente ${printifyOrderId} en la BD.`);
  }
}