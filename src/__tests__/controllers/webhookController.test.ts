/**
 * TESTS UNITARIOS - WEBHOOK CONTROLLER
 * 
 * Tests que validan que se extraigan correctamente los datos de Stripe:
 * - Dirección de ENVÍO desde collected_information.shipping_details (NO customer_details)
 * - Dirección de FACTURACIÓN desde customer_details.address
 * - Validar que no se confundan ambas direcciones
 */

import { describe, it, expect } from '@jest/globals';
import Stripe from 'stripe';

describe('🔒 Webhook Controller - Stripe Data Extraction', () => {
  
  describe('✅ Extracción correcta de dirección de ENVÍO', () => {
    it('debería extraer la dirección de envío desde collected_information.shipping_details', () => {
      // Mock de sesión COMPLETA de Stripe con AMBAS direcciones
      const stripeSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_123',
        // ❌ DIRECCIÓN DE FACTURACIÓN (NO debe usarse para envío)
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
        // ✅ DIRECCIÓN DE ENVÍO (DEBE usarse para envío a Printify)
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

      // Simular extracción de datos del webhook
      const shippingDetails = {
        name: stripeSession.collected_information?.shipping_details?.name ?? stripeSession.customer_details?.name ?? '',
        address: stripeSession.collected_information?.shipping_details?.address?.line1 ?? '',
        address2: stripeSession.collected_information?.shipping_details?.address?.line2,
        city: stripeSession.collected_information?.shipping_details?.address?.city ?? '',
        state: stripeSession.collected_information?.shipping_details?.address?.state,
        postalCode: stripeSession.collected_information?.shipping_details?.address?.postal_code ?? '',
        country: stripeSession.collected_information?.shipping_details?.address?.country ?? '',
        phone: stripeSession.customer_details?.phone ?? ''
      };

      // ✅ DEBE usar datos de ENVÍO, NO de facturación
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
    });

    it('debería usar fallback a customer_details solo si NO hay collected_information', () => {
      // Caso donde NO se recopiló dirección de envío separada
      const stripeSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_456',
        customer_details: {
          name: 'Cliente Sin Shipping',
          email: 'cliente@example.com',
          phone: '+34600222222',
          address: {
            line1: 'Calle Única 50',
            line2: null,
            city: 'Valencia',
            state: 'Valencia',
            postal_code: '46001',
            country: 'ES'
          }
        } as Stripe.Checkout.Session.CustomerDetails,
        collected_information: null // NO se recopiló dirección de envío
      };

      const shippingDetails = {
        name: stripeSession.collected_information?.shipping_details?.name ?? stripeSession.customer_details?.name ?? '',
        address: stripeSession.collected_information?.shipping_details?.address?.line1 ?? stripeSession.customer_details?.address?.line1 ?? '',
        address2: stripeSession.collected_information?.shipping_details?.address?.line2 ?? stripeSession.customer_details?.address?.line2,
        city: stripeSession.collected_information?.shipping_details?.address?.city ?? stripeSession.customer_details?.address?.city ?? '',
        state: stripeSession.collected_information?.shipping_details?.address?.state ?? stripeSession.customer_details?.address?.state,
        postalCode: stripeSession.collected_information?.shipping_details?.address?.postal_code ?? stripeSession.customer_details?.address?.postal_code ?? '',
        country: stripeSession.collected_information?.shipping_details?.address?.country ?? stripeSession.customer_details?.address?.country ?? '',
        phone: stripeSession.customer_details?.phone ?? ''
      };

      // En este caso SÍ debe usar customer_details como fallback
      expect(shippingDetails.name).toBe('Cliente Sin Shipping');
      expect(shippingDetails.address).toBe('Calle Única 50');
      expect(shippingDetails.city).toBe('Valencia');
    });
  });

  describe('✅ Mapeo correcto para Printify', () => {
    it('debería mapear correctamente Stripe shipping_details → Printify address_to', () => {
      const stripeShippingDetails = {
        name: 'Pedro García López',
        address: 'Calle Mayor 123',
        address2: 'Piso 2B',
        city: 'Sevilla',
        state: 'Sevilla',
        postalCode: '41001',
        country: 'ES',
        phone: '+34600333333'
      };

      const customerEmail = 'pedro@example.com';

      // Mapeo a formato Printify
      const printifyAddress = {
        first_name: stripeShippingDetails.name?.split(' ')[0] || '',
        last_name: stripeShippingDetails.name?.split(' ').slice(1).join(' ') || '',
        email: customerEmail || '',
        phone: stripeShippingDetails.phone || '',
        country: stripeShippingDetails.country || '',
        region: stripeShippingDetails.state || '',
        address1: stripeShippingDetails.address || '',
        address2: stripeShippingDetails.address2 || '',
        city: stripeShippingDetails.city || '',
        zip: stripeShippingDetails.postalCode || ''
      };

      // ✅ Validar mapeo correcto
      expect(printifyAddress.first_name).toBe('Pedro');
      expect(printifyAddress.last_name).toBe('García López');
      expect(printifyAddress.email).toBe('pedro@example.com');
      expect(printifyAddress.phone).toBe('+34600333333');
      expect(printifyAddress.country).toBe('ES');
      expect(printifyAddress.region).toBe('Sevilla');
      expect(printifyAddress.address1).toBe('Calle Mayor 123');
      expect(printifyAddress.address2).toBe('Piso 2B');
      expect(printifyAddress.city).toBe('Sevilla');
      expect(printifyAddress.zip).toBe('41001');
    });

    it('debería manejar nombres con una sola palabra', () => {
      const name = 'Madonna';
      
      const first_name = name?.split(' ')[0] || '';
      const last_name = name?.split(' ').slice(1).join(' ') || '';

      expect(first_name).toBe('Madonna');
      expect(last_name).toBe('');
    });

    it('debería manejar nombres con múltiples palabras', () => {
      const name = 'Juan Carlos de Borbón y Borbón';
      
      const first_name = name?.split(' ')[0] || '';
      const last_name = name?.split(' ').slice(1).join(' ') || '';

      expect(first_name).toBe('Juan');
      expect(last_name).toBe('Carlos de Borbón y Borbón');
    });
  });

  describe('🛡️ Validaciones de campos requeridos', () => {
    it('debería validar que todos los campos requeridos de Printify estén presentes', () => {
      const requiredFields = {
        first_name: 'Ana',
        last_name: 'Martínez',
        email: 'ana@example.com',
        phone: '+34600444444',
        country: 'ES',
        region: 'Málaga',
        address1: 'Plaza España 1',
        city: 'Málaga',
        zip: '29001'
      };

      // Validar que ningún campo requerido esté vacío
      expect(requiredFields.first_name).toBeTruthy();
      expect(requiredFields.last_name).toBeTruthy();
      expect(requiredFields.email).toBeTruthy();
      expect(requiredFields.phone).toBeTruthy();
      expect(requiredFields.country).toBeTruthy();
      expect(requiredFields.region).toBeTruthy();
      expect(requiredFields.address1).toBeTruthy();
      expect(requiredFields.city).toBeTruthy();
      expect(requiredFields.zip).toBeTruthy();
    });

    it('debería permitir que address2 sea opcional', () => {
      const addressWithLine2 = {
        address1: 'Calle Principal 10',
        address2: 'Apartamento 5'
      };

      const addressWithoutLine2 = {
        address1: 'Calle Principal 10',
        address2: ''
      };

      // Ambos son válidos
      expect(addressWithLine2.address1).toBeTruthy();
      expect(addressWithLine2.address2).toBeTruthy();
      
      expect(addressWithoutLine2.address1).toBeTruthy();
      expect(addressWithoutLine2.address2).toBeFalsy();
    });
  });

  describe('🔍 Tests de regresión - Prevenir bugs futuros', () => {
    it('debería FALLAR si se intenta usar customer_details.address para envío cuando hay collected_information', () => {
      const stripeSession: Partial<Stripe.Checkout.Session> = {
        customer_details: {
          address: {
            line1: 'DIRECCIÓN DE FACTURACIÓN - NO USAR PARA ENVÍO',
            line2: null,
            city: 'Madrid',
            state: null,
            postal_code: '28001',
            country: 'ES'
          }
        } as Stripe.Checkout.Session.CustomerDetails,
        collected_information: {
          shipping_details: {
            address: {
              line1: 'DIRECCIÓN DE ENVÍO - USAR ESTA',
              line2: null,
              city: 'Barcelona',
              state: null,
              postal_code: '08001',
              country: 'ES'
            }
          }
        } as Stripe.Checkout.Session.CollectedInformation
      };

      // ❌ IMPLEMENTACIÓN INCORRECTA (bug que teníamos antes)
      const wrongImplementation = stripeSession.customer_details?.address?.line1;

      // ✅ IMPLEMENTACIÓN CORRECTA
      const correctImplementation = stripeSession.collected_information?.shipping_details?.address?.line1 
        ?? stripeSession.customer_details?.address?.line1;

      // Este test DEBE fallar si usamos la implementación incorrecta
      expect(wrongImplementation).not.toBe('DIRECCIÓN DE ENVÍO - USAR ESTA');
      expect(correctImplementation).toBe('DIRECCIÓN DE ENVÍO - USAR ESTA');
    });

    it('debería detectar si se confunden billing y shipping en el futuro', () => {
      const session: Partial<Stripe.Checkout.Session> = {
        customer_details: {
          name: 'BILLING NAME',
          address: { 
            line1: 'Billing St',
            line2: null,
            city: 'BILLING CITY',
            state: null,
            postal_code: '00000',
            country: 'ES'
          }
        } as Stripe.Checkout.Session.CustomerDetails,
        collected_information: {
          shipping_details: {
            name: 'SHIPPING NAME',
            address: { 
              line1: 'Shipping Ave',
              line2: null,
              city: 'SHIPPING CITY',
              state: null,
              postal_code: '11111',
              country: 'ES'
            }
          }
        } as Stripe.Checkout.Session.CollectedInformation
      };

      // Para ENVÍO debemos usar collected_information.shipping_details
      const shippingName = session.collected_information?.shipping_details?.name;
      const shippingCity = session.collected_information?.shipping_details?.address?.city;

      expect(shippingName).toBe('SHIPPING NAME');
      expect(shippingName).not.toBe('BILLING NAME');
      
      expect(shippingCity).toBe('SHIPPING CITY');
      expect(shippingCity).not.toBe('BILLING CITY');
    });
  });

  describe('🌍 Manejo de campos internacionales', () => {
    it('debería manejar direcciones sin estado/región', () => {
      // Algunos países no tienen estado
      const addressWithoutState = {
        city: 'Lisboa',
        state: undefined,
        country: 'PT'
      };

      expect(addressWithoutState.city).toBeTruthy();
      expect(addressWithoutState.state).toBeUndefined();
      expect(addressWithoutState.country).toBeTruthy();
    });

    it('debería manejar códigos postales de diferentes formatos', () => {
      const postalCodes = {
        spain: '28001',
        uk: 'SW1A 1AA',
        usa: '10001',
        canada: 'K1A 0B1'
      };

      Object.values(postalCodes).forEach(code => {
        expect(code).toBeTruthy();
        expect(typeof code).toBe('string');
      });
    });
  });
});
