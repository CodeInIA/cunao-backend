import { Request, Response } from 'express';
import sharp from 'sharp';
import Review from '../models/Review.js';
import { db } from '../services/databaseService.js';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

const ADMIN_KEY = process.env.ADMIN_KEY || '';

function checkAdmin(req: any) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  return key && key === ADMIN_KEY;
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
  return res.json({ valid: true, customerName: order.customerName, orderId: order.orderId, lineItems: order.lineItems });
}

export async function submitReview(req: Request, res: Response) {
  try {
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

    for (const r of reviewsPayload) {
      const photosForField = grouped[`product-${r.productId}`] || [];

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
        const webpBuffer = await sharp(f.buffer).webp({ quality: 75 }).toBuffer();
        const uploadResult = await cloudinary.uploader.upload(`data:image/webp;base64,${webpBuffer.toString('base64')}`, {
          folder: `cunao/reviews/${reviewDoc._id}`,
          public_id: `review_${reviewDoc._id}_img_${idx}`,
          format: 'webp'
        });
        if (uploadResult && uploadResult.secure_url) photoUrls.push(uploadResult.secure_url);
      }

      reviewDoc.photos = photoUrls;
      await reviewDoc.save();
      savedReviews.push(reviewDoc);
    }

    await db.clearReviewToken(order.orderId);

    return res.json({ success: true, reviews: savedReviews });
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
    return res.json(reviews);
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
