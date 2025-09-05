import Stripe from 'stripe';
import { CartItem, ShippingAddress, StripePaymentIntent } from '../types/index.js';

class StripeService {
  private stripe: Stripe;

  constructor() {
    // Validar que la clave secreta de Stripe esté configurada
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY no está configurado en las variables de entorno');
    }
    
    // Usar la versión por defecto incluida en el paquete
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  // Crear Payment Intent
  async createPaymentIntent(
    amount: number,
    currency: string = 'eur',
    metadata: Record<string, string> = {}
  ): Promise<StripePaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convertir a céntimos
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true
        }
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret!
      };
    } catch (error: any) {
      console.error('Error al crear Payment Intent:', error);
      throw new Error('Error al procesar el pago: ' + error.message);
    }
  }

  // Confirmar pago
  async confirmPayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error: any) {
      console.error('Error al confirmar pago:', error);
      throw new Error('Error al confirmar el pago: ' + error.message);
    }
  }

    // Obtener los productos de una sesión de checkout
  async getCheckoutSessionLineItems(sessionId: string) {
    return this.stripe.checkout.sessions.listLineItems(sessionId);
  }

  // Calcular total del carrito
  calculateCartTotal(items: CartItem[]): number {
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  // Crear sesión de checkout
  async createCheckoutSession(
    lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
    successUrl: string,
    cancelUrl: string,
    metadata: Record<string, string> = {},
    options?: { shippingRegion?: string; client_reference_id?: string; subtotal?: number }
  ): Promise<Stripe.Checkout.Session> {
    try {
      const shippingRegion = options?.shippingRegion || '';
      const clientReferenceId = options?.client_reference_id;
      
      // Calcular subtotal desde los lineItems o usar el proporcionado
      const subtotal = options?.subtotal || lineItems.reduce((total: number, item) => {
        const price = item.price_data?.unit_amount || 0;
        const quantity = item.quantity || 1;
        return total + (price * quantity / 100);
      }, 0);
      
      const freeShippingThreshold = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || '85');
      const isFreeShipping = subtotal >= freeShippingThreshold;

      let shippingOption: any;
      switch (shippingRegion) {
        case 'spain':
          shippingOption = {
            display_name: 'España (Envío Estándar)',
            amount: isFreeShipping ? 0 : Math.round(parseFloat(process.env.SHIPPING_COST_SPAIN || '5.99') * 100),
            allowed_countries: ['ES']
          };
          break;
        case 'europa':
          shippingOption = {
            display_name: 'Resto de Europa (UE)',
            amount: isFreeShipping ? 0 : Math.round(parseFloat(process.env.SHIPPING_COST_EUROPA || '12.99') * 100),
            allowed_countries: ['FR', 'DE', 'IT', 'PT', 'GB', 'IE', 'NL', 'BE', 'LU', 'AT'] // Ejemplo
          };
          break;
        default:
          throw new Error('Región de envío no válida');
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        shipping_address_collection: {
          allowed_countries: shippingOption.allowed_countries,
        },
        phone_number_collection: {
          enabled: true
        },
        shipping_options: [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: shippingOption.amount,
                currency: 'eur',
              },
              display_name: shippingOption.display_name,
            },
          },
        ],
        billing_address_collection: 'required'
      };
      if (clientReferenceId) {
        sessionParams.client_reference_id = clientReferenceId;
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);
      return session;
    } catch (error: any) {
      console.error('Error al crear sesión de checkout:', error);
      throw new Error('Error al crear sesión de pago: ' + error.message);
    }
  }

  // Verificar webhook de Stripe
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (error: any) {
      console.error('Error al verificar webhook:', error);
      throw new Error('Webhook signature verification failed');
    }
  }

  // Obtener información de una sesión de checkout
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'customer_details']
      });
    } catch (error: any) {
      console.error('Error al obtener sesión de checkout:', error);
      throw new Error('Error al obtener información de la sesión: ' + error.message);
    }
  }
}

// Exportar una función que cree la instancia solo cuando se necesite
let stripeServiceInstance: StripeService | null = null;

export default {
  getInstance(): StripeService {
    if (!stripeServiceInstance) {
      stripeServiceInstance = new StripeService();
    }
    return stripeServiceInstance;
  }
};
