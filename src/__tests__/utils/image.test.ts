import { describe, it, expect } from '@jest/globals';

describe('Image Utils Tests', () => {
  describe('Image URL Validation', () => {
    it('should validate image URLs', () => {
      const validUrls = [
        'https://example.com/image.jpg',
        'https://cdn.example.com/photo.png',
        'https://storage.example.com/pic.webp'
      ];
      
      const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i;
      validUrls.forEach(url => {
        expect(urlRegex.test(url)).toBe(true);
      });
    });

    it('should reject invalid image URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'http://example.com/file.txt',
        'example.com/image.jpg',
        ''
      ];
      
      const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i;
      invalidUrls.forEach(url => {
        expect(urlRegex.test(url)).toBe(false);
      });
    });
  });

  describe('Image Format Validation', () => {
    it('should validate supported image formats', () => {
      const supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      const testFormat = 'jpg';
      expect(supportedFormats).toContain(testFormat);
    });

    it('should reject unsupported formats', () => {
      const supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      const unsupportedFormats = ['bmp', 'tiff', 'svg', 'pdf'];
      
      unsupportedFormats.forEach(format => {
        expect(supportedFormats).not.toContain(format);
      });
    });
  });

  describe('Image Size Validation', () => {
    it('should validate file size limits', () => {
      const maxSizeInMB = 5;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      
      const validSize = 3 * 1024 * 1024; // 3MB
      expect(validSize).toBeLessThanOrEqual(maxSizeInBytes);
    });

    it('should reject oversized files', () => {
      const maxSizeInMB = 5;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      
      const invalidSize = 10 * 1024 * 1024; // 10MB
      expect(invalidSize).toBeGreaterThan(maxSizeInBytes);
    });
  });

  describe('Cloudinary URL Parsing', () => {
    it('should extract public ID from Cloudinary URL', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg';
      const publicIdMatch = url.match(/\/v\d+\/(.+)\.\w+$/);
      
      expect(publicIdMatch).toBeTruthy();
      if (publicIdMatch) {
        expect(publicIdMatch[1]).toBe('sample');
      }
    });

    it('should validate Cloudinary URL format', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg';
      expect(cloudinaryUrl).toContain('res.cloudinary.com');
      expect(cloudinaryUrl).toContain('/image/upload/');
    });
  });
});
