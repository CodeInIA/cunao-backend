import Stripe from 'stripe';
import { CartItem, ShippingAddress, StripePaymentIntent } from '../types/index';

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

  // Calcular total del carrito
  calculateCartTotal(items: CartItem[]): number {
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  // Crear sesión de checkout
  async createCheckoutSession(
    items: CartItem[],
    successUrl: string,
    cancelUrl: string,
    metadata: Record<string, string> = {}
  ): Promise<Stripe.Checkout.Session> {
    try {
      const lineItems = items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            images: [item.image],
            metadata: {
              product_id: item.productId,
              variant_id: item.variantId.toString()
            }
          },
          unit_amount: Math.round(item.price * 100)
        },
        quantity: item.quantity
      }));

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        shipping_address_collection: {
          allowed_countries: ['ES', 'FR', 'DE', 'IT', 'PT', 'GB']
        },
        billing_address_collection: 'required'
      });

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
