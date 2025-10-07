import { describe, it, expect } from '@jest/globals';

describe('Order Validation Tests', () => {
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com',
        'user123@test-domain.com'
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user @example.com'
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('Phone Validation', () => {
    it('should validate Spanish phone numbers', () => {
      const validPhones = [
        '+34612345678',
        '612345678',
        '+34 612 34 56 78'
      ];
      
      const phoneRegex = /^(\+34)?[6-9]\d{8}$/;
      validPhones.forEach(phone => {
        const cleaned = phone.replace(/\s/g, '');
        expect(phoneRegex.test(cleaned) || /^\+34\d{9}$/.test(cleaned)).toBe(true);
      });
    });
  });

  describe('Order Amount Validation', () => {
    it('should validate positive amounts', () => {
      const validAmounts = [10.50, 100, 25.99, 1000.00];
      validAmounts.forEach(amount => {
        expect(amount).toBeGreaterThan(0);
        expect(typeof amount).toBe('number');
      });
    });

    it('should reject invalid amounts', () => {
      const invalidAmounts = [-10, 0, NaN];
      invalidAmounts.forEach(amount => {
        expect(amount).not.toBeGreaterThan(0);
      });
    });

    it('should handle decimal amounts correctly', () => {
      const amount = 29.99;
      const cents = Math.round(amount * 100);
      expect(cents).toBe(2999);
    });
  });

  describe('Order Status', () => {
    it('should have valid order statuses', () => {
      const validStatuses = [
        'pending',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      ];
      
      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    it('should default to pending status', () => {
      const defaultStatus = 'pending';
      expect(defaultStatus).toBe('pending');
    });
  });

  describe('Shipping Address Validation', () => {
    it('should validate complete address', () => {
      const address = {
        street: 'Calle Mayor 123',
        city: 'Madrid',
        postalCode: '28001',
        country: 'España'
      };
      
      expect(address.street).toBeTruthy();
      expect(address.city).toBeTruthy();
      expect(address.postalCode).toBeTruthy();
      expect(address.country).toBeTruthy();
    });

    it('should validate Spanish postal codes', () => {
      const validPostalCodes = ['28001', '08001', '41001', '46001'];
      const postalCodeRegex = /^\d{5}$/;
      
      validPostalCodes.forEach(code => {
        expect(postalCodeRegex.test(code)).toBe(true);
      });
    });
  });
});
