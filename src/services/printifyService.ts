import axios, { AxiosInstance } from 'axios';
import { PrintifyProduct, PrintifyVariant, OrderRequest, PrintifyOrder, ApiResponse } from '../types/index';

class PrintifyService {
  private api: AxiosInstance;
  private shopId: string;

  constructor() {
    // Validar variables de entorno
    if (!process.env.PRINTIFY_SHOP_ID) {
      throw new Error('PRINTIFY_SHOP_ID no está configurado en las variables de entorno');
    }
    if (!process.env.PRINTIFY_API_KEY) {
      throw new Error('PRINTIFY_API_KEY no está configurado en las variables de entorno');
    }

    this.shopId = process.env.PRINTIFY_SHOP_ID;
    
    this.api = axios.create({
      baseURL: 'https://api.printify.com/v1',
      headers: {
        'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Obtener todos los productos
  async getProducts(): Promise<PrintifyProduct[]> {
    try {
      const response = await this.api.get(`/shops/${this.shopId}/products.json`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error al obtener productos de Printify:', error);
      throw new Error('Error al cargar productos');
    }
  }

  // Obtener un producto específico
  async getProduct(productId: string): Promise<PrintifyProduct | null> {
    try {
      const response = await this.api.get(`/shops/${this.shopId}/products/${productId}.json`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener producto ${productId}:`, error);
      return null;
    }
  }

  // Obtener variantes de un producto
  async getProductVariants(productId: string): Promise<PrintifyVariant[]> {
    try {
      const response = await this.api.get(`/shops/${this.shopId}/products/${productId}/variants.json`);
      return response.data || [];
    } catch (error) {
      console.error(`Error al obtener variantes del producto ${productId}:`, error);
      throw new Error('Error al cargar variantes del producto');
    }
  }

    // Obtener información GPSR de un producto
  async getProductGPSR(productId: string): Promise<Array<{title: string, text: string}>> {
    try {
      const response = await this.api.get(`/shops/${this.shopId}/products/${productId}/gpsr.json`);
      return response.data || [];
    } catch (error) {
      console.error(`Error al obtener GPSR del producto ${productId}:`, error);
      return [];
    }
  }

  // Crear un pedido
  async createOrder(orderData: OrderRequest): Promise<PrintifyOrder> {
    try {
      const response = await this.api.post(`/shops/${this.shopId}/orders.json`, orderData);
      return response.data;
    } catch (error: any) {
      console.error('Error al crear pedido en Printify:', error.response?.data || error);
      throw new Error('Error al procesar el pedido');
    }
  }

  // Obtener información de un pedido
  async getOrder(orderId: string): Promise<PrintifyOrder | null> {
    try {
      const response = await this.api.get(`/shops/${this.shopId}/orders/${orderId}.json`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener pedido ${orderId}:`, error);
      return null;
    }
  }

  // Enviar un pedido a producción
  async submitOrderToProduction(orderId: string): Promise<boolean> {
    try {
      await this.api.post(`/shops/${this.shopId}/orders/${orderId}/send_to_production.json`);
      return true;
    } catch (error) {
      console.error(`Error al enviar pedido ${orderId} a producción:`, error);
      return false;
    }
  }

  // Obtener costos de envío
  async getShippingCosts(line_items: any[], address_to: any): Promise<any[]> {
    try {
      const response = await this.api.post(`/shops/${this.shopId}/orders/shipping.json`, {
        line_items,
        address_to
      });
      return response.data || [];
    } catch (error) {
      console.error('Error al obtener costos de envío:', error);
      throw new Error('Error al calcular gastos de envío');
    }
  }
}

// Exportar una función que cree la instancia solo cuando se necesite
let printifyServiceInstance: PrintifyService | null = null;

export default {
  getInstance(): PrintifyService {
    if (!printifyServiceInstance) {
      printifyServiceInstance = new PrintifyService();
    }
    return printifyServiceInstance;
  }
};
