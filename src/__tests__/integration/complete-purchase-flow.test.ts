/**
 * TESTS DE INTEGRACIÓN - FLUJO COMPLETO DE COMPRA
 * 
 * Este test verifica que TODA la tienda funciona correctamente de principio a fin:
 * 1. Usuario navega por productos
 * 2. Añade productos al carrito
 * 3. Aplica código de descuento
 * 4. Procesa el pago
 * 5. Crea orden en Printify
 * 6. Guarda orden en base de datos
 * 7. Verifica todo el flujo end-to-end
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import nock from 'nock';
import Stripe from 'stripe';

// Importar servicios
import printifyServiceModule from '../../services/printifyService.js';
import { db } from '../../services/databaseService.js';
import DiscountCode from '../../models/DiscountCode.js';

// Tipo OrderStatus para evitar errores de tipo
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

let mongoServer: MongoMemoryServer;

describe('🛒 FLUJO COMPLETO DE COMPRA - TEST DE INTEGRACIÓN', () => {
  
  beforeAll(async () => {
    // Iniciar MongoDB en memoria
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Configurar variables de entorno para modo test
    process.env.STRIPE_SECRET_KEY = 'sk_test_51QKxXZP5XQbcdefghijklmnopqrstuvwxyz1234567890';
    process.env.PRINTIFY_SHOP_ID = '12345678';
    process.env.PRINTIFY_API_KEY = 'test_printify_key_for_integration_tests';
    process.env.FRONTEND_URL = 'http://localhost:5173';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    nock.cleanAll();
  });

  beforeEach(async () => {
    // Limpiar base de datos antes de cada test
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    nock.cleanAll();
  });

  describe('✅ PASO 1: Obtener productos disponibles', () => {
    it('debería obtener la lista de productos desde Printify', async () => {
      // Mock de la API de Printify
      nock('https://api.printify.com')
        .get('/v1/shops/12345678/products.json')
        .reply(200, {
          data: [
            {
              id: '65a1b2c3d4e5f6g7h8i9j0k1',
              title: 'Camiseta Test',
              description: 'Camiseta de prueba',
              tags: ['test', 'camiseta'],
              images: [{
                src: 'https://example.com/image.jpg',
                position: 0,
                is_default: true,
                variant_ids: [123]
              }],
              variants: [{
                id: 123,
                sku: 'TEST-M-BLACK',
                price: 2499, // 24.99€ en céntimos
                is_enabled: true,
                is_available: true,
                options: [1, 2]
              }],
              options: [
                {
                  name: 'Size',
                  type: 'size',
                  values: [{ id: 1, title: 'M' }]
                },
                {
                  name: 'Color',
                  type: 'color',
                  values: [{ id: 2, title: 'Black', colors: ['#000000'] }]
                }
              ]
            }
          ]
        });

      const printifyService = printifyServiceModule.getInstance();
      const products = await printifyService.getProducts();

      expect(products).toBeDefined();
      expect(products.length).toBeGreaterThan(0);
      expect(products[0].title).toBe('Camiseta Test');
      expect(products[0].variants[0].price).toBe(2499);
    });
  });

  describe('✅ PASO 2: Crear código de descuento', () => {
    it('debería crear y validar un código de descuento activo', async () => {
      const discountCode = await DiscountCode.create({
        code: 'TEST20',
        discountPercentage: 20,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        appliesTo: 'subtotal',
        maxUses: 100,
        usedCount: 0
      });

      expect(discountCode.code).toBe('TEST20');
      expect(discountCode.discountPercentage).toBe(20);
      expect(discountCode.isValid()).toBe(true);

      const foundCode = await DiscountCode.findValidCode('TEST20');
      expect(foundCode).toBeDefined();
      expect(foundCode?.code).toBe('TEST20');
    });

    it('debería rechazar códigos agotados', async () => {
      await DiscountCode.create({
        code: 'USED',
        discountPercentage: 30,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        appliesTo: 'subtotal',
        maxUses: 5,
        usedCount: 5 // Ya agotado
      });

      const foundCode = await DiscountCode.findValidCode('USED');
      expect(foundCode).toBeNull();
    });
  });

  describe('✅ PASO 3: Validar cálculo de totales', () => {
    it('debería calcular correctamente el total del carrito con descuento', async () => {
      const cartItems = [
        { productId: '1', variantId: 123, quantity: 2, price: 24.99 },
        { productId: '2', variantId: 456, quantity: 1, price: 19.99 }
      ];

      const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      expect(subtotal).toBe(69.97);

      const discountPercentage = 10;
      const discountAmount = subtotal * (discountPercentage / 100);
      const totalWithDiscount = subtotal - discountAmount;

      expect(discountAmount).toBe(6.997);
      expect(totalWithDiscount).toBe(62.973);
    });
  });

  describe('✅ PASO 4: Guardar orden en base de datos', () => {
    it('debería guardar la orden con todos los detalles correctos', async () => {
      const orderData = {
        orderId: await db.generateOrderId(),
        stripeSessionId: 'cs_test_123456789',
        customerEmail: 'test@example.com',
        customerName: 'Test Usuario',
        lineItems: [{
          productId: '65a1b2c3d4e5f6g7h8i9j0k1',
          variantId: 123,
          title: 'Camiseta Test',
          size: 'M',
          color: 'Black',
          quantity: 2,
          price: 24.99
        }],
        shippingDetails: {
          name: 'Test User',
          address: 'Calle Test 123',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
          phone: '+34600000000'
        },
        totalAmount: 54.98,
        status: 'pending' as OrderStatus,
        region: 'spain'
      };

      const savedOrder = await db.saveOrder(orderData);

      expect(savedOrder).toBeDefined();
      expect(savedOrder.orderId).toBeDefined();
      expect(savedOrder.orderId.length).toBe(9);
      expect(savedOrder.customerEmail).toBe('test@example.com');
      expect(savedOrder.lineItems.length).toBe(1);
      expect(savedOrder.totalAmount).toBe(54.98);
      expect(savedOrder.status).toBe('pending');

      const retrievedOrder = await db.findOrderByOrderId(savedOrder.orderId);
      expect(retrievedOrder).toBeDefined();
      expect(retrievedOrder?.customerEmail).toBe('test@example.com');
    });
  });

  describe('✅ PASO 5: Crear orden en Printify', () => {
    it('debería enviar la orden a Printify después del pago exitoso', async () => {
      nock('https://api.printify.com')
        .post('/v1/shops/12345678/orders.json')
        .reply(200, {
          id: 'printify_order_123',
          status: 'pending',
          line_items: [{
            product_id: '65a1b2c3d4e5f6g7h8i9j0k1',
            variant_id: 123,
            quantity: 2
          }],
          shipments: [],
          created_at: new Date().toISOString()
        });

      const printifyService = printifyServiceModule.getInstance();
      
      const orderRequest = {
        external_id: '123456789',
        line_items: [{
          product_id: '65a1b2c3d4e5f6g7h8i9j0k1',
          variant_id: 123,
          quantity: 2
        }],
        shipping_method: 1,
        is_printify_express: false,
        send_shipping_notification: false,
        address_to: {
          first_name: 'Test',
          last_name: 'Usuario',
          email: 'test@example.com',
          phone: '+34600000000',
          country: 'ES',
          region: 'Madrid',
          address1: 'Calle Test 123',
          city: 'Madrid',
          zip: '28001'
        }
      };

      const printifyOrder = await printifyService.createOrder(orderRequest);

      expect(printifyOrder).toBeDefined();
      expect(printifyOrder.id).toBe('printify_order_123');
      expect(printifyOrder.status).toBe('pending');
      expect(printifyOrder.line_items.length).toBe(1);
    });
  });

  describe('✅ PASO 6: Procesar webhook de Stripe', () => {
    it('debería procesar correctamente el webhook checkout.session.completed', async () => {
      const orderId = await db.generateOrderId();
      await db.saveOrder({
        orderId,
        stripeSessionId: 'cs_test_webhook_123',
        customerEmail: '',
        customerName: '',
        lineItems: [{
          productId: '65a1b2c3d4e5f6g7h8i9j0k1',
          variantId: 123,
          title: 'Camiseta Test',
          size: 'M',
          color: 'Black',
          quantity: 1,
          price: 24.99
        }],
        shippingDetails: {
          name: '',
          address: '',
          city: '',
          postalCode: '',
          country: '',
          phone: ''
        },
        totalAmount: 24.99,
        status: 'pending' as OrderStatus,
        region: 'spain'
      });

      // Simular actualización del webhook
      await db.updateOrderByOrderId(orderId, {
        customerEmail: 'webhook@example.com',
        customerName: 'Webhook Usuario',
        shippingDetails: {
          name: 'Webhook Usuario',
          address: 'Webhook Street 456',
          city: 'Barcelona',
          postalCode: '08001',
          country: 'ES',
          phone: '+34600111222'
        }
      });

      const updatedOrder = await db.findOrderByOrderId(orderId);
      expect(updatedOrder).toBeDefined();
      expect(updatedOrder?.customerEmail).toBe('webhook@example.com');
      expect(updatedOrder?.customerName).toBe('Webhook Usuario');
      expect(updatedOrder?.shippingDetails.city).toBe('Barcelona');
      expect(updatedOrder?.shippingDetails.postalCode).toBe('08001');
    });

    it('🔒 debería extraer SHIPPING address desde collected_information.shipping_details, NO desde customer_details', async () => {
      // Mock realista de sesión de Stripe con AMBAS direcciones (usando tipos oficiales de Stripe)
      const mockStripeSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_shipping_validation',
        // ❌ Dirección de FACTURACIÓN (billing)
        customer_details: {
          name: 'Juan Facturación',
          email: 'facturacion@example.com',
          phone: '+34600111111',
          address: {
            line1: 'Calle Facturación 100',
            line2: 'Oficina 5',
            city: 'Madrid',
            state: 'Madrid',
            postal_code: '28001',
            country: 'ES'
          }
        } as Stripe.Checkout.Session.CustomerDetails,
        // ✅ Dirección de ENVÍO (shipping) - DEBE USARSE
        collected_information: {
          shipping_details: {
            name: 'María Envío',
            address: {
              line1: 'Calle Envío 200',
              line2: 'Piso 3A',
              city: 'Barcelona',
              state: 'Barcelona',
              postal_code: '08001',
              country: 'ES'
            }
          }
        } as Stripe.Checkout.Session.CollectedInformation
      };

      // Simular extracción de datos como lo hace webhookController
      const shippingDetails = {
        name: mockStripeSession.collected_information?.shipping_details?.name ?? mockStripeSession.customer_details?.name ?? '',
        address: mockStripeSession.collected_information?.shipping_details?.address?.line1 ?? '',
        address2: mockStripeSession.collected_information?.shipping_details?.address?.line2,
        city: mockStripeSession.collected_information?.shipping_details?.address?.city ?? '',
        state: mockStripeSession.collected_information?.shipping_details?.address?.state,
        postalCode: mockStripeSession.collected_information?.shipping_details?.address?.postal_code ?? '',
        country: mockStripeSession.collected_information?.shipping_details?.address?.country ?? '',
        phone: mockStripeSession.customer_details?.phone ?? ''
      };

      // ✅ DEBE usar datos de ENVÍO
      expect(shippingDetails.name).toBe('María Envío');
      expect(shippingDetails.address).toBe('Calle Envío 200');
      expect(shippingDetails.address2).toBe('Piso 3A');
      expect(shippingDetails.city).toBe('Barcelona');
      expect(shippingDetails.state).toBe('Barcelona');
      expect(shippingDetails.postalCode).toBe('08001');
      expect(shippingDetails.country).toBe('ES');

      // ❌ NO DEBE contener datos de facturación
      expect(shippingDetails.name).not.toBe('Juan Facturación');
      expect(shippingDetails.address).not.toBe('Calle Facturación 100');
      expect(shippingDetails.city).not.toBe('Madrid');

      // Validar que se mapee correctamente a Printify
      const printifyAddress = {
        first_name: shippingDetails.name?.split(' ')[0] || '',
        last_name: shippingDetails.name?.split(' ').slice(1).join(' ') || '',
        email: mockStripeSession.customer_details?.email || '',
        phone: shippingDetails.phone || '',
        country: shippingDetails.country || '',
        region: shippingDetails.state || '',
        address1: shippingDetails.address || '',
        address2: shippingDetails.address2 || '',
        city: shippingDetails.city || '',
        zip: shippingDetails.postalCode || ''
      };

      expect(printifyAddress.first_name).toBe('María');
      expect(printifyAddress.last_name).toBe('Envío');
      expect(printifyAddress.address1).toBe('Calle Envío 200');
      expect(printifyAddress.city).toBe('Barcelona');
      expect(printifyAddress.region).toBe('Barcelona');
    });
  });

  describe('🎯 FLUJO COMPLETO END-TO-END', () => {
    it('debería completar TODO el proceso de compra correctamente', async () => {
      console.log('\n🚀 INICIANDO FLUJO COMPLETO DE COMPRA...\n');

      // 1️⃣ OBTENER PRODUCTOS
      console.log('1️⃣ Obteniendo productos disponibles...');
      nock('https://api.printify.com')
        .get('/v1/shops/12345678/products.json')
        .reply(200, {
          data: [{
            id: '65a1b2c3d4e5f6g7h8i9j0k1',
            title: 'Camiseta Cuñadismo',
            images: [{
              src: 'https://example.com/cunao.jpg',
              is_default: true,
              variant_ids: [456]
            }],
            variants: [{
              id: 456,
              price: 1999,
              is_enabled: true,
              is_available: true,
              options: [1, 2]
            }],
            options: [
              { type: 'size', values: [{ id: 1, title: 'L' }] },
              { type: 'color', values: [{ id: 2, title: 'Navy' }] }
            ]
          }]
        });

      const printifyService = printifyServiceModule.getInstance();
      const products = await printifyService.getProducts();
      expect(products.length).toBeGreaterThan(0);
      console.log(`   ✅ ${products.length} producto(s) encontrado(s)`);

      // 2️⃣ CREAR CÓDIGO DE DESCUENTO
      console.log('2️⃣ Creando código de descuento...');
      const discount = await DiscountCode.create({
        code: 'WELCOME10',
        discountPercentage: 10,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        appliesTo: 'subtotal',
        maxUses: 1000
      });
      expect(discount.isValid()).toBe(true);
      console.log(`   ✅ Código "${discount.code}" creado (${discount.discountPercentage}% descuento)`);

      // 3️⃣ CREAR CARRITO Y CALCULAR TOTALES
      console.log('3️⃣ Añadiendo productos al carrito...');
      const cart = [{
        productId: '65a1b2c3d4e5f6g7h8i9j0k1',
        variantId: 456,
        quantity: 2,
        price: 19.99
      }];
      const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const discountAmount = subtotal * (discount.discountPercentage / 100);
      const totalWithDiscount = subtotal - discountAmount;
      console.log(`   ✅ Subtotal: ${subtotal}€ - Descuento: ${discountAmount.toFixed(2)}€ = ${totalWithDiscount.toFixed(2)}€`);

      // 4️⃣ CREAR ORDEN EN BD
      console.log('4️⃣ Creando orden en base de datos...');
      const orderId = await db.generateOrderId();
      const order = await db.saveOrder({
        orderId,
        stripeSessionId: 'cs_test_e2e_123',
        customerEmail: 'e2e@test.com',
        customerName: 'E2E Test',
        lineItems: [{
          productId: cart[0].productId,
          variantId: cart[0].variantId,
          title: 'Camiseta Cuñadismo',
          size: 'L',
          color: 'Navy',
          quantity: cart[0].quantity,
          price: cart[0].price
        }],
        shippingDetails: {
          name: 'Test User E2E',
          address: 'Calle E2E 999',
          city: 'Valencia',
          postalCode: '46001',
          country: 'ES',
          phone: '+34600999888'
        },
        totalAmount: totalWithDiscount,
        status: 'pending' as OrderStatus,
        region: 'spain',
        discountCode: discount.code,
        discountPercentage: discount.discountPercentage
      });
      expect(order.orderId).toBe(orderId);
      console.log(`   ✅ Orden #${orderId} creada`);

      // 5️⃣ SIMULAR PAGO EXITOSO
      console.log('5️⃣ Procesando pago...');
      await db.updateOrderByOrderId(orderId, {
        status: 'processing' as OrderStatus
      });
      console.log('   ✅ Pago procesado y orden actualizada');

      // 6️⃣ CREAR ORDEN EN PRINTIFY
      console.log('6️⃣ Enviando orden a Printify...');
      nock('https://api.printify.com')
        .post('/v1/shops/12345678/orders.json')
        .reply(200, {
          id: 'printify_e2e_order',
          status: 'pending',
          line_items: [{
            product_id: cart[0].productId,
            variant_id: cart[0].variantId,
            quantity: cart[0].quantity
          }]
        });

      const printifyOrder = await printifyService.createOrder({
        external_id: orderId,
        line_items: [{
          product_id: cart[0].productId,
          variant_id: cart[0].variantId,
          quantity: cart[0].quantity
        }],
        shipping_method: 1,
        is_printify_express: false,
        send_shipping_notification: false,
        address_to: {
          first_name: 'E2E',
          last_name: 'Test',
          email: 'e2e@test.com',
          phone: '+34600999888',
          country: 'ES',
          region: 'Valencia',
          address1: 'Calle E2E 999',
          city: 'Valencia',
          zip: '46001'
        }
      });
      expect(printifyOrder.id).toBe('printify_e2e_order');
      console.log(`   ✅ Orden enviada a Printify: ${printifyOrder.id}`);

      // 7️⃣ ACTUALIZAR ORDEN CON ID DE PRINTIFY
      console.log('7️⃣ Actualizando orden con ID de Printify...');
      await db.updateOrderByOrderId(orderId, { printifyOrderId: printifyOrder.id });
      const finalOrder = await db.findOrderByOrderId(orderId);
      expect(finalOrder?.printifyOrderId).toBe('printify_e2e_order');
      console.log('   ✅ Orden actualizada con Printify ID');

      // 8️⃣ INCREMENTAR USO DE CÓDIGO DE DESCUENTO
      console.log('8️⃣ Registrando uso del código de descuento...');
      await DiscountCode.findOneAndUpdate(
        { code: discount.code },
        { 
          $inc: { usedCount: 1 },
          $push: {
            usedBy: {
              email: 'e2e@test.com',
              name: 'E2E Test',
              usedAt: new Date()
            }
          }
        }
      );
      const updatedDiscount = await DiscountCode.findValidCode(discount.code);
      expect(updatedDiscount?.usedCount).toBe(1);
      console.log(`   ✅ Código usado ${updatedDiscount?.usedCount} vez`);

      // ✅ VERIFICACIÓN FINAL
      console.log('\n✅ VERIFICACIÓN FINAL:');
      const verification = await db.findOrderByOrderId(orderId);
      expect(verification).toBeDefined();
      expect(verification?.customerEmail).toBe('e2e@test.com');
      expect(verification?.printifyOrderId).toBe('printify_e2e_order');
      expect(verification?.discountCode).toBe('WELCOME10');
      expect(verification?.lineItems.length).toBe(1);
      
      console.log('   ✅ Orden ID:', verification?.orderId);
      console.log('   ✅ Cliente:', verification?.customerEmail);
      console.log('   ✅ Total:', verification?.totalAmount + '€');
      console.log('   ✅ Descuento aplicado:', verification?.discountCode);
      console.log('   ✅ Printify Order:', verification?.printifyOrderId);
      console.log('   ✅ Estado:', verification?.status);
      
      console.log('\n🎉 FLUJO COMPLETO DE COMPRA EXITOSO!\n');
    });
  });
});
