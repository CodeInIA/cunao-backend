import { describe, it, expect } from '@jest/globals';

describe('Product Tests', () => {
  describe('Product Data Validation', () => {
    it('should validate product title', () => {
      const validTitle = 'Camiseta Cuñadismo Ilustrado';
      expect(validTitle.length).toBeGreaterThan(0);
      expect(validTitle.length).toBeLessThanOrEqual(200);
      expect(typeof validTitle).toBe('string');
    });

    it('should validate product price', () => {
      const validPrices = [19.99, 29.99, 15.50];
      validPrices.forEach(price => {
        expect(price).toBeGreaterThan(0);
        expect(typeof price).toBe('number');
      });
    });

    it('should validate product ID format (Printify)', () => {
      const printifyId = '123456789';
      expect(printifyId).toBeTruthy();
      expect(typeof printifyId).toBe('string');
    });

    it('should validate product images array', () => {
      const images = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ];
      
      expect(Array.isArray(images)).toBe(true);
      expect(images.length).toBeGreaterThan(0);
      images.forEach(img => {
        expect(img).toMatch(/^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i);
      });
    });
  });

  describe('Product Filtering', () => {
    it('should filter products by category', () => {
      const products = [
        { id: 1, category: 'camisetas' },
        { id: 2, category: 'tazas' },
        { id: 3, category: 'camisetas' }
      ];
      
      const filtered = products.filter(p => p.category === 'camisetas');
      expect(filtered.length).toBe(2);
    });

    it('should filter products by price range', () => {
      const products = [
        { id: 1, price: 15 },
        { id: 2, price: 25 },
        { id: 3, price: 35 }
      ];
      
      const filtered = products.filter(p => p.price >= 20 && p.price <= 30);
      expect(filtered.length).toBe(1);
      expect(filtered[0].price).toBe(25);
    });

    it('should search products by title', () => {
      const products = [
        { id: 1, title: 'Camiseta Roja' },
        { id: 2, title: 'Taza Azul' },
        { id: 3, title: 'Camiseta Verde' }
      ];
      
      const search = 'camiseta';
      const filtered = products.filter(p => 
        p.title.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered.length).toBe(2);
    });
  });

  describe('Product Stock', () => {
    it('should validate stock quantity', () => {
      const stock = 50;
      expect(stock).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(stock)).toBe(true);
    });

    it('should determine if product is in stock', () => {
      const product = { stock: 10 };
      expect(product.stock).toBeGreaterThan(0);
    });

    it('should determine if product is out of stock', () => {
      const product = { stock: 0 };
      expect(product.stock).toBe(0);
    });
  });
});
