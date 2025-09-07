/**
 * Utilidades para manejo de imágenes optimizadas en el backend
 */

export interface ProductImage {
  src: string;
  cdnUrl?: string;
  cdnPublicId?: string;
  cdnUrls?: {
    thumbnail: string;
    medium: string;
    large: string;
    original: string;
  };
  variant_ids: number[];
  position: string | number;
  is_default?: boolean;
  alt?: string;
}

/**
 * Obtiene la URL de máxima calidad WebP disponible para una imagen
 * Prioriza CDN WebP sobre URL original
 */
export function getOptimizedImageUrl(
  image: ProductImage, 
  size: 'thumbnail' | 'medium' | 'large' | 'original' = 'original'
): string {
  // Siempre usar la máxima calidad WebP disponible del CDN
  if (image.cdnUrl) {
    return image.cdnUrl;
  }
  
  // Fallback a URL original de Printify si no hay CDN
  return image.src;
}

/**
 * Obtiene la imagen principal de un producto
 */
export function getMainProductImage(images: ProductImage[]): ProductImage | null {
  if (!images || images.length === 0) return null;
  
  // Buscar imagen marcada como default
  const defaultImage = images.find(img => img.is_default);
  if (defaultImage) return defaultImage;
  
  // Si no hay default, buscar la primera imagen
  return images[0] || null;
}

/**
 * Obtiene la imagen apropiada para una variante específica
 */
export function getVariantImage(images: ProductImage[], variantId: number): ProductImage | null {
  if (!images || images.length === 0) return null;
  
  // Buscar imagen específica para esta variante
  const variantImage = images.find(img => 
    img.variant_ids && img.variant_ids.includes(variantId)
  );
  
  if (variantImage) return variantImage;
  
  // Fallback a imagen principal
  return getMainProductImage(images);
}

/**
 * Convierte una imagen a URL WebP optimizada para uso en Stripe, emails, etc.
 */
export function getWebPImageUrl(image: ProductImage | string): string {
  if (typeof image === 'string') {
    // Si es solo una URL string, retornarla tal como está
    return image;
  }
  
  // Si es un objeto ProductImage, obtener la URL optimizada
  return getOptimizedImageUrl(image, 'original');
}

/**
 * Prepara imágenes para uso en Stripe checkout
 * Convierte todas las imágenes a URLs WebP optimizadas
 */
export function prepareImagesForStripe(images: (ProductImage | string)[]): string[] {
  return images
    .filter(Boolean) // Filtrar valores null/undefined
    .map(image => getWebPImageUrl(image))
    .slice(0, 8); // Stripe permite máximo 8 imágenes
}

/**
 * Obtiene URL de imagen optimizada para emails
 * Asegura que sea WebP y esté disponible públicamente
 */
export function getEmailImageUrl(image: ProductImage | string): string {
  if (typeof image === 'string') {
    return image;
  }
  
  // Para emails, siempre usar CDN si está disponible (mejor deliverability)
  return getOptimizedImageUrl(image, 'medium'); // Medium size para emails
}
