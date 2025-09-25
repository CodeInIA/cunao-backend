import { Request, Response } from 'express';
import sharp from 'sharp';
import Review from '../models/Review.js';
import { db } from '../services/databaseService.js';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

// Cloudinary is configured centrally in server.ts

const ADMIN_KEY = process.env.ADMIN_KEY || '';

function checkAdmin(req: any) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  return key && key === ADMIN_KEY;
}

// Helpers: format author name for display (Name + initials of surnames)
function shortenName(name?: string) {
  if (!name) return 'Anónimo';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.slice(1).map(p => p[0]).join('. ')}.`;
}

function formatReviewForResponse(review: any) {
  // work with plain object
  const obj = review && typeof review.toObject === 'function' ? review.toObject() : (review._doc ? review._doc : { ...review });
  obj.authorName = shortenName(obj.authorName);
  return obj;
}

// helper slugify (mirror databaseService.slugify so frontend/back share same slugs)
function slugify(text: string) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function enrichReviewsWithProductInfo(reviews: any[]) {
  const plain = reviews.map(r => (r && typeof r.toObject === 'function' ? r.toObject() : (r._doc ? r._doc : { ...r })));
  const productIds = Array.from(new Set(plain.map(p => p.productId).filter(Boolean)));
  const productPromises = productIds.map(pid => db.getProductByPrintifyId(String(pid)).catch(() => null));
  const products = await Promise.all(productPromises);
  const productMap: Record<string, any> = {};
  productIds.forEach((pid, i) => { productMap[String(pid)] = products[i]; });

  return plain.map(p => {
    const out: any = { ...p };
    out.authorName = shortenName(out.authorName);
    const prod = productMap[String(out.productId)];
    if (prod) {
      out.productTitle = prod.title || '';
      out.productSlug = slugify(prod.title || '');
    } else {
      out.productTitle = undefined;
      out.productSlug = undefined;
    }
    return out;
  });
}

// Tamaño máximo total por review: 8MB (considerando hasta 5 imágenes por producto)
const MAX_TOTAL_IMAGE_BYTES = 8 * 1024 * 1024;
// Mínimos requeridos
const MIN_REVIEW_CHARS = 20;

export async function validateToken(req: Request, res: Response) {
  const { token } = req.params;
  if (!token) return res.status(400).json({ error: 'Token requerido' });
  const order = await db.findOrderByReviewToken(token);
  if (!order) return res.status(404).json({ valid: false });
  const tokenUsed = !!(order.reviewToken && (order.reviewToken as any).used);
  if (tokenUsed) {
    return res.json({ valid: false, tokenUsed: true, customerName: order.customerName, orderId: order.orderId });
  }
  // Exponer formatos aceptados para que el frontend los muestre
  const acceptedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const acceptedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  return res.json({ valid: true, customerName: order.customerName, orderId: order.orderId, lineItems: order.lineItems, acceptedMimeTypes, acceptedExtensions });
}

export async function submitReview(req: Request, res: Response) {
  try {
    // Validate Cloudinary configuration early to provide a clearer error than a generic 401
    try {
      const cfg = cloudinary.config();
      // cloudinary.config() may return an object with cloud_name or undefined depending on env
      const cloudName = (cfg && (cfg as any).cloud_name) || process.env.CLOUDINARY_CLOUD_NAME || (process.env.CLOUDINARY_URL ? (process.env.CLOUDINARY_URL.split('@')[1] || '').trim() : '');
      if (!cloudName) {
        console.error('Cloudinary configuration missing cloud_name:', cloudName);
        return res.status(500).json({ error: 'Cloudinary configuration missing', detail: `No cloud_name configured for Cloudinary. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME in environment.` });
      }
    } catch (cfgErr) {
      console.error('Error reading Cloudinary config', cfgErr);
      return res.status(500).json({ error: 'Cloudinary configuration error', detail: String(cfgErr && (cfgErr as any).message ? (cfgErr as any).message : cfgErr) });
    }

    const token = req.params.token;
    if (!token) return res.status(400).json({ error: 'Token requerido' });

    // Buscar orden por token
    const order = await db.findOrderByReviewToken(token);
    if (!order) return res.status(404).json({ error: 'Token inválido o expirado' });

    // Verificar que token no esté expirado
    const rt = order.reviewToken;
    if (!rt || rt.token !== token) return res.status(404).json({ error: 'Token inválido' });
    if (rt.expiresAt && new Date(rt.expiresAt) < new Date()) {
      // Borrar token y guardar orden
      order.reviewToken = undefined;
      await order.save();
      return res.status(410).json({ error: 'Token expirado' });
    }

    const reviewsPayload = JSON.parse(req.body.payload || '[]');
  const files: any[] = (req as any).files ? (Array.isArray((req as any).files) ? (req as any).files : Object.values((req as any).files).flat()) : [];

    const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) return res.status(400).json({ error: 'Las imágenes exceden el tamaño máximo permitido' });

    // Agrupar archivos por fieldname (pueden venir como product-<productId>-<idx>)
    const grouped: Record<string, any[]> = {};
    for (const f of files) {
      const field = f.fieldname || 'default';
      grouped[field] = grouped[field] || [];
      grouped[field].push(f);
    }

    // Validación server-side: mínimo de caracteres por producto
    const validationErrors: Record<string, any> = {};
    for (const r of reviewsPayload) {
      const errs: any = {};
      if (!r.body || (r.body || '').toString().trim().length < MIN_REVIEW_CHARS) {
        errs.text = `La reseña debe tener al menos ${MIN_REVIEW_CHARS} caracteres.`;
      }
      if (Object.keys(errs).length > 0) validationErrors[r.productId] = errs;
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', validationErrors });
    }

    const savedReviews: any[] = [];

    // Formatos permitidos
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];

    for (const r of reviewsPayload) {
      // soportar keys como product-<productId>-<idx> o product-<productId> o product-<fieldKey>
      let photosForField: any[] = [];
      if (r.fieldKey) {
        // buscar coincidencias exactas que empiecen por product-<fieldKey>
        photosForField = Object.entries(grouped)
          .filter(([k]) => k.startsWith(`product-${r.fieldKey}`))
          .map(([_, arr]) => arr)
          .flat();
      }
      // fallback al comportamiento anterior (por productId) si no hay fieldKey o no se encontraron archivos
      if ((!photosForField || photosForField.length === 0) && r.productId) {
        photosForField = Object.entries(grouped)
          .filter(([k]) => k.startsWith(`product-${r.productId}`))
          .map(([_, arr]) => arr)
          .flat();
      }

      const reviewDoc = new Review({
        orderId: order.orderId,
        productId: r.productId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        authorName: r.authorName || order.customerName || 'Anónimo',
        photos: [],
        status: 'pending'
      });
      await reviewDoc.save();

      const photoUrls: string[] = [];
      for (const [idx, f] of photosForField.slice(0,5).entries()) {
        // Validar mimetype
        const mimetype = (f.mimetype || '').toString().toLowerCase();
        if (!allowedMime.includes(mimetype)) {
          return res.status(400).json({ error: `Formato de imagen no admitido (${mimetype}). Sólo se aceptan JPG, PNG o WebP.` });
        }

        // Convertir a WebP siempre para homogeneizar
        const webpBuffer = await sharp(f.buffer).webp({ quality: 75 }).toBuffer();

        // Subir a Cloudinary en la carpeta cunao/reviews/:review_id
        let uploadResult: any;
        try {
          uploadResult = await cloudinary.uploader.upload(`data:image/webp;base64,${webpBuffer.toString('base64')}`, {
            folder: `cunao/reviews/${reviewDoc._id}`,
            public_id: `review_${reviewDoc._id}_img_${idx}`,
            format: 'webp',
            overwrite: true,
            resource_type: 'image'
          });
        } catch (uploadErr: any) {
          console.error('Cloudinary upload error', uploadErr && uploadErr.message ? uploadErr.message : uploadErr);
          const msg = uploadErr && uploadErr.message ? uploadErr.message : 'Error uploading to Cloudinary';
          return res.status(uploadErr && uploadErr.http_code ? uploadErr.http_code : 502).json({ error: 'Cloudinary upload failed', detail: msg });
        }
        if (uploadResult && uploadResult.secure_url) photoUrls.push(uploadResult.secure_url);
      }

      reviewDoc.photos = photoUrls;
      await reviewDoc.save();
      savedReviews.push(reviewDoc);
    }

    // Mark the review token as used so the same token cannot be reused to submit again
    try {
      await db.markReviewTokenUsed(order.orderId);
    } catch (e) {
      console.warn('Warning: could not mark review token as used', e);
    }

  const enriched = await enrichReviewsWithProductInfo(savedReviews);
  return res.json({ success: true, reviews: enriched });
  } catch (error: any) {
    console.error('Error submitReview', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function listReviews(req: Request, res: Response) {
  try {
    const productId = req.query.productId as string | undefined;
    const query: any = { status: 'published' };
    if (productId) query.productId = productId;
  const reviews = await Review.find(query).sort({ createdAt: -1 }).limit(50).exec();
  const enriched = await enrichReviewsWithProductInfo(reviews);
  return res.json(enriched);
  } catch (e) {
    console.error('listReviews error', e);
    return res.status(500).json([]);
  }
}

export async function publishReview(req: Request, res: Response) {
  try {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id;
    const review = await Review.findByIdAndUpdate(id, { status: 'published' }, { new: true }).exec();
    if (!review) return res.status(404).json({ error: 'No encontrado' });
    return res.json({ success: true, review });
  } catch (e) {
    console.error('publishReview error', e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function generateTokenForOrder(req: Request, res: Response) {
  try {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const orderId = req.params.orderId;
    if (!orderId) return res.status(400).json({ error: 'orderId requerido' });
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const updated = await db.createReviewTokenForOrder(orderId, token, expiresAt);
    if (!updated) return res.status(404).json({ error: 'Order no encontrada' });
    return res.json({ success: true, token, expiresAt });
  } catch (e) {
    console.error('generateTokenForOrder error', e);
    return res.status(500).json({ error: 'Error interno' });
  }
}
