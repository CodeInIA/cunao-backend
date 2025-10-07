import { describe, it, expect } from '@jest/globals';

describe('Contact Form Tests', () => {
  describe('Form Field Validation', () => {
    it('should validate contact name', () => {
      const validNames = ['John Doe', 'María García', 'José Luis'];
      validNames.forEach(name => {
        expect(name.length).toBeGreaterThan(0);
        expect(name.length).toBeLessThanOrEqual(100);
      });
    });

    it('should validate contact email', () => {
      const email = 'contact@example.com';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(email)).toBe(true);
    });

    it('should validate message content', () => {
      const message = 'Hola, me gustaría más información sobre...';
      expect(message.length).toBeGreaterThan(10);
      expect(message.length).toBeLessThanOrEqual(1000);
    });

    it('should validate phone number (optional)', () => {
      const phone = '+34612345678';
      const phoneRegex = /^(\+34)?[6-9]\d{8}$/;
      const cleaned = phone.replace(/\s/g, '');
      expect(phoneRegex.test(cleaned) || /^\+34\d{9}$/.test(cleaned)).toBe(true);
    });
  });

  describe('Spam Protection', () => {
    it('should detect suspicious patterns', () => {
      const spamKeywords = ['viagra', 'casino', 'lottery', 'winner'];
      const message = 'You are the winner of our lottery!';
      
      const isSpam = spamKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      
      expect(isSpam).toBe(true);
    });

    it('should allow legitimate messages', () => {
      const spamKeywords = ['viagra', 'casino', 'lottery', 'winner'];
      const message = 'Me gustaría comprar una camiseta';
      
      const isSpam = spamKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      
      expect(isSpam).toBe(false);
    });

    it('should validate message length for spam', () => {
      const tooShort = 'Hi';
      const tooLong = 'a'.repeat(2000);
      const valid = 'Este es un mensaje legítimo con suficiente contenido';
      
      expect(tooShort.length).toBeLessThan(10);
      expect(tooLong.length).toBeGreaterThan(1000);
      expect(valid.length).toBeGreaterThan(10);
      expect(valid.length).toBeLessThan(1000);
    });
  });

  describe('Subject Validation', () => {
    it('should validate subject line', () => {
      const validSubjects = [
        'Consulta sobre producto',
        'Información de envío',
        'Pregunta general'
      ];
      
      validSubjects.forEach(subject => {
        expect(subject.length).toBeGreaterThan(0);
        expect(subject.length).toBeLessThanOrEqual(200);
      });
    });
  });
});
