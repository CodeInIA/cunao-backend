import crypto from 'crypto';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Stripe from 'stripe';
import { asyncHandler } from '../middleware/errorHandler.js';
import stripeServiceModule from '../services/stripeService.js';
import printifyServiceModule from '../services/printifyService.js';
import imageServiceModule from '../services/imageService.js';
import * as notificationService from '../services/notificationService.js';
import { db } from '../services/databaseService.js';
import { PrintifyProduct, PaymentMethodInfo } from '../types/index.js';
import Client from '../models/Client.js';
import Newsletter from '../models/Newsletter.js';
import WeeklyProduct from '../models/WeeklyProducts.js';
import DiscountCode from '../models/DiscountCode.js';

// --- Función slugify ---
function slugify(text: string): string {
    if (!text) return '';
    return text.toString().toLowerCase().replace(/ñ/g, 'n').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Resuelve el método de pago real usado en una Checkout Session.
 * session.payment_method_types[0] siempre devuelve 'card', incluso si el cliente
 * pagó con Google Pay o Apple Pay. Para detectarlo correctamente hay que expandir
 * el payment_intent y leer card.wallet.type del PaymentMethod asociado.
 * Devuelve un objeto { provider, cardBrand? } para capturar ambos niveles.
 */
async function resolvePaymentMethod(session: Stripe.Checkout.Session): Promise<PaymentMethodInfo> {
  try {
    const stripe = stripeServiceModule.getStripeInstance();
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    if (!paymentIntentId) {
      return { provider: session.payment_method_types?.[0] || 'card' };
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['payment_method']
    });

    const pm = paymentIntent.payment_method as Stripe.PaymentMethod | null;
    if (!pm) return { provider: session.payment_method_types?.[0] || 'card' };

    // Wallet (Google Pay, Apple Pay, Link, etc.) — también capturamos la marca de la tarjeta subyacente
    if (pm.type === 'card' && pm.card?.wallet?.type) {
      const result: PaymentMethodInfo = { provider: pm.card.wallet.type };
      if (pm.card?.brand) result.cardBrand = pm.card.brand;
      return result;
    }

    // Tarjeta sin wallet — la marca es el identificador principal
    if (pm.type === 'card' && pm.card?.brand) {
      return { provider: pm.card.brand };
    }

    return { provider: pm.type || session.payment_method_types?.[0] || 'card' };
  } catch (e) {
    console.warn('No se pudo resolver el método de pago real:', e);
    return { provider: session.payment_method_types?.[0] || 'card' };
  }
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
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
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
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completado:', session.id);

  // Usar client_reference_id para actualizar la orden existente (ahora es nuestro orderId personalizado)
  const orderId = session.client_reference_id;
  if (!orderId) {
    console.error('No se recibió client_reference_id en la sesión de Stripe.');
    return;
  }

  // Actualizar la orden existente usando el orderId personalizado
  const shippingCost = ((session.amount_total ?? 0) - (session.amount_subtotal ?? 0)) / 100;
  
  // Calcular el descuento aplicado
  const discountCode = session.metadata?.discount_code || '';
  const discountPercentage = session.metadata?.discount_percentage ? parseFloat(session.metadata.discount_percentage) : undefined;
  const discountAppliesTo = session.metadata?.discount_applies_to as 'subtotal' | 'shipping' | undefined;
  
  let discountAmount = 0;
  if (discountCode && discountPercentage && discountAppliesTo) {
    if (discountAppliesTo === 'subtotal') {
      // Para descuentos en subtotal, Stripe lo registra en amount_discount
      const stripeService = stripeServiceModule.getInstance();
      const detailedSession = await stripeService.getCheckoutSession(session.id);
      if (detailedSession.total_details?.amount_discount) {
        discountAmount = detailedSession.total_details.amount_discount / 100;
      }
    } else if (discountAppliesTo === 'shipping') {
      // Para descuentos en envío, calculamos manualmente
      // El descuento ya está aplicado en el shipping_cost, así que calculamos el monto original
      const originalShippingCost = shippingCost / (1 - discountPercentage / 100);
      discountAmount = originalShippingCost - shippingCost;
    }
  }
  
  // Resolver el método de pago real una sola vez (se reutiliza abajo para el cliente)
  const resolvedPaymentMethod = await resolvePaymentMethod(session);

  const updatedOrder = await db.updateOrderByOrderId(orderId, {
    stripeSessionId: session.id,
    customerEmail: session.customer_details?.email ?? undefined,
    customerName: session.customer_details?.name ?? undefined,
    totalAmount: (session.amount_total ?? 0) / 100,
    shippingCost: shippingCost,
    paymentMethod: resolvedPaymentMethod,
    discountCode: discountCode,
    discountPercentage: discountPercentage,
    discountAppliesTo: discountAppliesTo,
    discountAmount: discountAmount > 0 ? discountAmount : undefined,
    shippingDetails: {
      name: session.collected_information?.shipping_details?.name ?? session.customer_details?.name ?? '',
      address: session.collected_information?.shipping_details?.address?.line1 ?? '',
      address2: session.collected_information?.shipping_details?.address?.line2 ?? undefined,
      city: session.collected_information?.shipping_details?.address?.city ?? '',
      state: session.collected_information?.shipping_details?.address?.state ?? undefined,
      postalCode: session.collected_information?.shipping_details?.address?.postal_code ?? '',
      country: session.collected_information?.shipping_details?.address?.country ?? '',
      phone: session.customer_details?.phone ?? '',
    },
    status: 'processing'
  });

  if (!updatedOrder) {
    console.error('No se encontró la orden en la base de datos para actualizar por orderId:', orderId);
    return;
  }

  // Log de información del descuento
  if (discountCode) {
    console.log(`💰 Descuento aplicado en orden ${orderId}:`, {
      code: discountCode,
      percentage: discountPercentage,
      appliesTo: discountAppliesTo,
      amount: discountAmount
    });
  }

  // Incrementar el contador de usos del cupón de descuento si se usó uno
  if (updatedOrder.discountCode) {
    try {
      const discountCode = await DiscountCode.findOne({ code: updatedOrder.discountCode.toUpperCase() });
      if (discountCode) {
        discountCode.usedCount = (discountCode.usedCount || 0) + 1;
        
        // Registrar quién usó el cupón
        const usageRecord = {
          email: session.customer_details?.email ?? '',
          name: session.customer_details?.name ?? undefined,
          usedAt: new Date()
        };
        
        if (!discountCode.usedBy) {
          discountCode.usedBy = [];
        }
        discountCode.usedBy.push(usageRecord);
        
        await discountCode.save();
        console.log(`✅ Contador de usos actualizado para el cupón: ${discountCode.code} (${discountCode.usedCount}${discountCode.maxUses ? `/${discountCode.maxUses}` : ' usos'})`);
        console.log(`📝 Uso registrado para: ${usageRecord.email}`);
      } else {
        console.warn(`⚠️ No se encontró el cupón de descuento: ${updatedOrder.discountCode}`);
      }
    } catch (discountError) {
      console.error('Error actualizando contador de usos del cupón:', discountError);
      // No fallar el proceso completo por un error en el cupón
    }
  }

  // Guardar o actualizar datos del cliente
  try {
    const customerEmail = session.customer_details?.email;
    // Nombre de facturación (customer_details), no el de envío
    const customerName = session.customer_details?.name ?? session.collected_information?.shipping_details?.name;
    const shippingAddress = session.collected_information?.shipping_details?.address;
    const phone = session.customer_details?.phone;
    
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
      const customerId = typeof session.customer === 'string' ? session.customer : undefined;
      existingClient.paymentInfo.stripeCustomerId = customerId ?? existingClient.paymentInfo.stripeCustomerId;
      existingClient.paymentInfo.lastPaymentMethod = resolvedPaymentMethod ?? existingClient.paymentInfo.lastPaymentMethod;
      
      // Actualizar dirección de envío y teléfono con los datos más recientes
      if (shippingAddress) {
        existingClient.address = {
          line1: shippingAddress.line1 || existingClient.address.line1,
          line2: shippingAddress.line2 || existingClient.address.line2,
          city: shippingAddress.city || existingClient.address.city,
          state: shippingAddress.state || existingClient.address.state,
          postal_code: shippingAddress.postal_code || existingClient.address.postal_code,
          country: shippingAddress.country || existingClient.address.country,
        };
      }
      if (phone) existingClient.phone = phone;
      if (customerName) existingClient.name = customerName;

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
          line1: shippingAddress?.line1 || '',
          line2: shippingAddress?.line2 || '',
          city: shippingAddress?.city || '',
          state: shippingAddress?.state || '',
          postal_code: shippingAddress?.postal_code || '',
          country: shippingAddress?.country || ''
        },
        paymentInfo: {
          stripeCustomerId: session.customer || '',
          lastPaymentMethod: resolvedPaymentMethod
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
        
        // Intentar obtener la información completa actualizada del producto desde Printify
        let fullProduct;
        try {
            fullProduct = await printifyService.getProduct(productId);
        } catch (error: any) {
            // Si el producto no existe en Printify (404), probablemente fue eliminado
            if (error.response?.status === 404) {
                console.log(`📋 Producto ${productId} no encontrado en Printify (posiblemente eliminado)`);
                
                if (existingProduct) {
                    console.log(`📋 Producto ${productId} encontrado en base de datos, eliminando recursos`);
                    
                    // Eliminar todas las imágenes del producto del CDN
                    if (existingProduct.images && existingProduct.images.length > 0) {
                        console.log(`🗑️ Eliminando todas las imágenes del producto ${productId} del CDN`);
                        
                        try {
                            const deleteResult = await imageService.deleteProductImages(productId);
                            console.log(`�️ ${deleteResult.deletedCount} imágenes eliminadas del CDN`);
                            
                            if (deleteResult.errors.length > 0) {
                                console.warn(`⚠️ Se encontraron errores durante la eliminación:`, deleteResult.errors);
                            }
                        } catch (deleteError) {
                            console.error(`❌ Error eliminando imágenes del CDN:`, deleteError);
                        }
                    }
                    
                    // Eliminar el producto de la base de datos
                    try {
                        await db.deleteProductByPrintifyId(productId);
                        console.log(`Producto ${productId} eliminado de la base de datos.`);
                        console.log(`✅ Producto ${productId} eliminado exitosamente de la base de datos y CDN`);
                    } catch (dbError) {
                        console.error(`❌ Error eliminando producto ${productId} de la base de datos:`, dbError);
                    }
                } else {
                    console.log(`📋 Producto ${productId} no encontrado en base de datos, no se requiere limpieza`);
                }
                
                return; // Terminar aquí ya que el producto fue eliminado
            } else {
                // Cualquier otro error, re-lanzar
                throw error;
            }
        }
        
        if (!fullProduct) {
            console.error(`No se pudo obtener el producto ${productId} de Printify`);
            return;
        }

        console.log(`Producto ${productId} obtenido de Printify API:`, {
            title: fullProduct.title,
            imagesCount: fullProduct.images?.length || 0,
            variantsCount: fullProduct.variants?.length || 0
        });

        let processedImages: any[] = [];
        
        if (existingProduct) {
            console.log(`� Producto ${productId} ya existe en la base de datos`);
            
            // Verificar si las imágenes ya están optimizadas
            const hasOptimizedImages = existingProduct.images?.some((img: any) => img.cdnUrl);
            
            if (hasOptimizedImages) {
                console.log(`✅ Producto ${productId} ya tiene imágenes optimizadas, reutilizando imágenes existentes`);
                processedImages = existingProduct.images;
            } else {
                console.log(`🔄 Producto ${productId} existe pero necesita optimización de imágenes`);
                // Procesar imágenes más adelante
            }
        }

        // Procesar imágenes solo si es necesario (producto nuevo o imágenes no optimizadas)
        if (processedImages.length === 0 && fullProduct.images && fullProduct.images.length > 0) {
            console.log(`🖼️ Iniciando procesamiento de imágenes para producto ${productId}`);
            
            // Usar sincronización inteligente que verifica imagen por imagen
            const syncResult = await imageService.processProductImagesSync(productId, fullProduct.images);
            
            console.log(`📊 Resultado de sincronización:`, {
                nuevas: syncResult.newImagesCount,
                existentes: syncResult.skippedImagesCount,
                total: syncResult.totalImages
            });
            
            // Combinar datos originales con URLs de CDN
            processedImages = fullProduct.images.map((originalImage, index) => {
                const processedImage = syncResult.processedImages.find(result => 
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

            console.log(`✅ Procesamiento de imágenes completado: ${syncResult.processedImages.length}/${fullProduct.images.length} imágenes optimizadas`);
        }

        // Si el producto ya existe, hacer sincronización inteligente de imágenes
        if (existingProduct && existingProduct.images) {
            console.log(`🔄 Sincronizando imágenes del producto existente ${productId}`);
            
            // Crear mapas para comparación eficiente
            const printifyImageUrls = new Set(fullProduct.images.map(img => img.src));
            const dbImages = existingProduct.images || [];
            const dbImageUrls = new Set(dbImages.map(img => img.src));
            
            // Encontrar imágenes que están en DB pero no en Printify (para eliminar)
            const imagesToRemove = dbImages.filter(dbImg => !printifyImageUrls.has(dbImg.src));
            
            // Encontrar imágenes que están en Printify pero no en DB (para añadir)
            const imagesToAdd = fullProduct.images.filter(printifyImg => !dbImageUrls.has(printifyImg.src));
            
            console.log(`📊 Análisis de sincronización:`, {
                enDB: dbImages.length,
                enPrintify: fullProduct.images.length,
                paraEliminar: imagesToRemove.length,
                paraAñadir: imagesToAdd.length
            });
            
            // Eliminar imágenes que ya no están en Printify
            if (imagesToRemove.length > 0) {
                console.log(`🗑️ Eliminando ${imagesToRemove.length} imágenes que ya no están en Printify`);
                
                const publicIdsToDelete = imagesToRemove
                    .filter(img => img.cdnPublicId)
                    .map(img => img.cdnPublicId)
                    .filter((id): id is string => typeof id === 'string');
                
                if (publicIdsToDelete.length > 0) {
                    try {
                        await imageService.deleteImages(publicIdsToDelete);
                        console.log(`✅ ${publicIdsToDelete.length} imágenes eliminadas del CDN`);
                    } catch (error) {
                        console.error(`❌ Error eliminando imágenes del CDN:`, error);
                    }
                }
            }
            
            // Procesar nuevas imágenes de Printify si las hay
            if (imagesToAdd.length > 0) {
                console.log(`📥 Procesando ${imagesToAdd.length} nuevas imágenes de Printify`);
                
                try {
                    const syncResult = await imageService.processProductImagesSync(productId, imagesToAdd);
                    console.log(`✅ Nuevas imágenes procesadas: ${syncResult.processedImages.length}/${imagesToAdd.length}`);
                } catch (error) {
                    console.error(`❌ Error procesando nuevas imágenes:`, error);
                }
            }
            
            // Reconstruir processedImages con las imágenes finales que deben estar en DB
            console.log(`🔧 Reconstruyendo array final de imágenes para guardar en DB`);
            
            // Si estamos reutilizando imágenes existentes, partir de ellas
            if (processedImages.length > 0) {
                // Filtrar solo las imágenes que siguen siendo válidas según Printify
                processedImages = processedImages.filter(img => printifyImageUrls.has(img.src));
                console.log(`🔄 Imágenes existentes válidas mantenidas: ${processedImages.length}`);
            }
            
            // Obtener todas las imágenes desde Printify y combinar con datos de CDN existentes/nuevos
            const finalImages: any[] = [];
            
            for (const printifyImage of fullProduct.images) {
                // Buscar si ya tenemos esta imagen procesada (ya sea existente o recién reutilizada)
                let existingProcessed = processedImages.find(img => img.src === printifyImage.src);
                
                if (existingProcessed) {
                    // Usar la imagen ya procesada
                    finalImages.push(existingProcessed);
                } else {
                    // Buscar en las imágenes existentes de la DB si tiene datos de CDN
                    const existingDbImage = dbImages.find(img => img.src === printifyImage.src);
                    
                    if (existingDbImage && existingDbImage.cdnUrl) {
                        // Usar los datos de CDN existentes
                        finalImages.push({
                            ...printifyImage,
                            cdnUrl: existingDbImage.cdnUrl,
                            cdnPublicId: existingDbImage.cdnPublicId,
                            cdnUrls: existingDbImage.cdnUrls
                        });
                    } else {
                        // Imagen nueva sin procesar (fallback a URL original)
                        finalImages.push(printifyImage);
                    }
                }
            }
            
            processedImages = finalImages;
            console.log(`✅ Array final de imágenes construido: ${processedImages.length} imágenes para guardar en DB`);
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

            const addedToWeekly = await addWeeklyProduct(productId);
            
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
        // Obtener el producto de la base de datos antes de eliminarlo
        const product = await db.getProductByPrintifyId(productId);
        
        if (product) {
            console.log(`📋 Producto ${productId} encontrado en base de datos, eliminando recursos`);
            
            const imageService = imageServiceModule.getInstance();
            
            // Eliminar todas las imágenes del producto del CDN usando la nueva función
            const deleteResult = await imageService.deleteProductImages(productId);
            
            if (deleteResult.deletedCount > 0) {
                console.log(`🗑️ ${deleteResult.deletedCount} imágenes eliminadas del CDN`);
            }
            
            if (deleteResult.errors.length > 0) {
                console.warn(`⚠️ Errores eliminando imágenes del CDN:`, deleteResult.errors);
            }
        }

        // Eliminar el producto de la base de datos
        const deleted = await db.deleteProductByPrintifyId(productId);
        if (deleted) {
            // También eliminar de la colección de productos semanales si existe
            try {
                const weeklyDeleteResult = await WeeklyProduct.deleteMany({ printifyProductId: productId });
                if (weeklyDeleteResult.deletedCount > 0) {
                    console.log(`📅 Producto ${productId} eliminado de ${weeklyDeleteResult.deletedCount} entrada(s) de productos semanales`);
                } else {
                    console.log(`📅 Producto ${productId} no se encontró en productos semanales`);
                }
            } catch (weeklyError) {
                console.error(`❌ Error eliminando producto ${productId} de productos semanales:`, weeklyError);
            }
            
            console.log(`✅ Producto ${productId} eliminado exitosamente de la base de datos y CDN`);
        } else {
            console.log(`📋 El producto ${productId} no se encontró en la base de datos`);
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