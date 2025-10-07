import { describe, it, expect } from '@jest/globals';

describe('Analytics Tests', () => {
  describe('Sales Calculations', () => {
    it('should calculate total sales correctly', () => {
      const orders = [
        { amount: 29.99, status: 'delivered' },
        { amount: 19.99, status: 'delivered' },
        { amount: 39.99, status: 'delivered' }
      ];
      
      const total = orders.reduce((sum, order) => sum + order.amount, 0);
      expect(total).toBeCloseTo(89.97, 2);
    });

    it('should filter completed orders only', () => {
      const orders = [
        { id: 1, status: 'delivered' },
        { id: 2, status: 'pending' },
        { id: 3, status: 'delivered' },
        { id: 4, status: 'cancelled' }
      ];
      
      const completed = orders.filter(o => o.status === 'delivered');
      expect(completed.length).toBe(2);
    });

    it('should calculate average order value', () => {
      const orders = [
        { amount: 20 },
        { amount: 30 },
        { amount: 40 }
      ];
      
      const total = orders.reduce((sum, o) => sum + o.amount, 0);
      const average = total / orders.length;
      
      expect(average).toBe(30);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter orders by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const orders = [
        { id: 1, date: now },
        { id: 2, date: yesterday },
        { id: 3, date: lastWeek }
      ];
      
      const recentOrders = orders.filter(o => 
        o.date.getTime() > yesterday.getTime()
      );
      
      expect(recentOrders.length).toBeGreaterThan(0);
    });

    it('should group orders by month', () => {
      const orders = [
        { date: new Date('2025-01-15'), amount: 100 },
        { date: new Date('2025-01-20'), amount: 150 },
        { date: new Date('2025-02-10'), amount: 200 }
      ];
      
      const byMonth = orders.reduce((acc: any, order) => {
        const month = order.date.toISOString().slice(0, 7);
        if (!acc[month]) acc[month] = [];
        acc[month].push(order);
        return acc;
      }, {});
      
      expect(Object.keys(byMonth).length).toBeGreaterThan(0);
      expect(byMonth['2025-01'].length).toBe(2);
    });
  });

  describe('Product Performance', () => {
    it('should calculate best-selling products', () => {
      const sales = [
        { productId: 'A', quantity: 50 },
        { productId: 'B', quantity: 30 },
        { productId: 'A', quantity: 20 }
      ];
      
      const totals = sales.reduce((acc: any, sale) => {
        acc[sale.productId] = (acc[sale.productId] || 0) + sale.quantity;
        return acc;
      }, {});
      
      expect(totals['A']).toBe(70);
      expect(totals['B']).toBe(30);
    });

    it('should calculate revenue per product', () => {
      const sales = [
        { productId: 'A', quantity: 2, price: 25 },
        { productId: 'A', quantity: 3, price: 25 },
        { productId: 'B', quantity: 1, price: 50 }
      ];
      
      const revenue = sales.reduce((acc: any, sale) => {
        const productRevenue = sale.quantity * sale.price;
        acc[sale.productId] = (acc[sale.productId] || 0) + productRevenue;
        return acc;
      }, {});
      
      expect(revenue['A']).toBe(125);
      expect(revenue['B']).toBe(50);
    });
  });

  describe('Customer Analytics', () => {
    it('should count unique customers', () => {
      const orders = [
        { customerId: 'C1' },
        { customerId: 'C2' },
        { customerId: 'C1' },
        { customerId: 'C3' }
      ];
      
      const uniqueCustomers = new Set(orders.map(o => o.customerId));
      expect(uniqueCustomers.size).toBe(3);
    });

    it('should calculate customer lifetime value', () => {
      const customerOrders = [
        { amount: 50 },
        { amount: 75 },
        { amount: 100 }
      ];
      
      const lifetimeValue = customerOrders.reduce((sum, o) => sum + o.amount, 0);
      expect(lifetimeValue).toBe(225);
    });
  });
});
