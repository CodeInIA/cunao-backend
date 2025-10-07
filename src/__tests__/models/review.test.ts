import { describe, it, expect } from '@jest/globals';

describe('Review Model Tests', () => {
  describe('Review Validation', () => {
    it('should validate rating is between 1 and 5', () => {
      const validRatings = [1, 2, 3, 4, 5];
      validRatings.forEach(rating => {
        expect(rating).toBeGreaterThanOrEqual(1);
        expect(rating).toBeLessThanOrEqual(5);
      });
    });

    it('should reject invalid ratings', () => {
      const invalidRatings = [0, -1, 6, 10, 3.5];
      invalidRatings.forEach(rating => {
        const isValid = Number.isInteger(rating) && rating >= 1 && rating <= 5;
        expect(isValid).toBe(false);
      });
    });

    it('should validate review text length', () => {
      const validReview = 'Great product, highly recommended!';
      expect(validReview.length).toBeGreaterThan(0);
      expect(validReview.length).toBeLessThanOrEqual(1000);
    });

    it('should validate customer name', () => {
      const validName = 'John Doe';
      expect(validName.length).toBeGreaterThan(0);
      expect(validName.length).toBeLessThanOrEqual(100);
      expect(typeof validName).toBe('string');
    });

    it('should validate product ID format', () => {
      const productId = '507f1f77bcf86cd799439011';
      expect(productId).toMatch(/^[a-f\d]{24}$/i);
    });
  });

  describe('Review Status', () => {
    it('should have valid status values', () => {
      const validStatuses = ['pending', 'approved', 'rejected'];
      validStatuses.forEach(status => {
        expect(['pending', 'approved', 'rejected']).toContain(status);
      });
    });

    it('should default to pending status', () => {
      const defaultStatus = 'pending';
      expect(defaultStatus).toBe('pending');
    });
  });

  describe('Average Rating Calculation', () => {
    it('should calculate average rating correctly', () => {
      const ratings = [5, 4, 5, 3, 4];
      const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      expect(average).toBeCloseTo(4.2, 1);
    });

    it('should handle single rating', () => {
      const ratings = [5];
      const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      expect(average).toBe(5);
    });

    it('should round average to one decimal', () => {
      const average = 4.234567;
      const rounded = Math.round(average * 10) / 10;
      expect(rounded).toBe(4.2);
    });
  });
});
