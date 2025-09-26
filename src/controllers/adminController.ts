import { Request, Response } from 'express';
import User from '../models/User.js';
import Review from '../models/Review.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../services/databaseService.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'please_change_me';

function validateEmailDomain(email: string): { isValid: boolean; suggestion?: string } {
  const blockedDomains = [
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.org',
    'yopmail.com', 'temp-mail.org', 'throwaway.email', 'getnada.com',
    'maildrop.cc', 'mailnesia.com', 'trashmail.com', '33mail.com',
    'dispostable.com', 'fake-mail.ml', 'mohmal.com', 'emailfake.com'
  ];
  const trustedDomains = [
    'gmail.com','googlemail.com','google.com','outlook.com','outlook.es','hotmail.com','hotmail.es','live.com','live.es','msn.com','yahoo.com','yahoo.es','icloud.com','me.com','mac.com','aol.com','protonmail.com','proton.me','tutanota.com'
  ];

  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) return { isValid: false };
  const [localPart, domain] = parts;
  if (!localPart || localPart.length < 1 || localPart.length > 64) return { isValid: false };
  if (!domain || domain.length < 3 || domain.length > 255) return { isValid: false };
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return { isValid: false };
  const ext = domainParts[domainParts.length - 1];
  if (ext.length < 2 || ext.length > 6) return { isValid: false };
  if (!/^[a-zA-Z]+$/.test(ext)) return { isValid: false };
  for (const p of domainParts) if (!p || p.length < 1 || !/^[a-zA-Z0-9-]+$/.test(p)) return { isValid: false };
  if (blockedDomains.includes(domain)) return { isValid: false };
  if (!trustedDomains.includes(domain)) {
    const commonDomains: Record<string, string> = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'yaho.com': 'yahoo.com', 'outlok.com': 'outlook.com' };
    if (commonDomains[domain]) return { isValid: false, suggestion: email.replace(domain, commonDomains[domain]) };
    return { isValid: false };
  }
  return { isValid: true };
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });
    // Validar formato y dominio del email
    const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
    if (!emailRegex.test(String(email).trim()) || String(email).length > 100) return res.status(400).json({ error: 'Formato de email inválido' });
    const domainValid = validateEmailDomain(String(email).trim());
    if (!domainValid.isValid) {
      if (domainValid.suggestion) return res.status(400).json({ error: `¿Quisiste decir ${domainValid.suggestion}?` });
      return res.status(400).json({ error: 'Por favor usa un proveedor de email conocido (Gmail, Outlook, Yahoo, etc.)' });
    }
    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const token = jwt.sign({ userId: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '12h' });

    // Generar csrf token para double-submit cookie
    const csrfToken = crypto.randomBytes(24).toString('hex');

    // Setear cookie de sesión (HttpOnly) y cookie csrf (no HttpOnly para que el frontend la lea)
    const secure = process.env.NODE_ENV === 'production';
    // Si no estamos en production y usamos http, los navegadores rechazan SameSite=None sin Secure.
    const sameSiteVal: 'none' | 'lax' = secure ? 'none' : 'lax';
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure,
      sameSite: sameSiteVal,
      maxAge: 12 * 60 * 60 * 1000, // 12 horas
      path: '/'
    });
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false,
      secure,
      sameSite: sameSiteVal,
      maxAge: 12 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json({ ok: true });
  } catch (e: any) {
    console.error('admin login error', e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function logout(req: Request, res: Response) {
  try {
  const secure = process.env.NODE_ENV === 'production';
  const sameSiteVal: 'none' | 'lax' = secure ? 'none' : 'lax';
  res.clearCookie('adminToken', { path: '/', secure, sameSite: sameSiteVal });
  res.clearCookie('csrfToken', { path: '/', secure, sameSite: sameSiteVal });
    return res.json({ ok: true });
  } catch (e) {
    console.error('logout error', e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function me(req: Request, res: Response) {
  try {
    // adminAuth llenará req.user
    // Si no hay usuario, devolvemos 401
    // @ts-ignore
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    // @ts-ignore
    return res.json({ user: { id: req.user.id, email: req.user.email, role: req.user.role } });
  } catch (e) {
    console.error('me error', e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function listReviewsAdmin(req: Request, res: Response) {
  try {
    const status = (req.query.status as string) || undefined;
    const q: any = {};
    if (status) q.status = status;
    const reviews = await Review.find(q).sort({ createdAt: -1 }).limit(200).exec();
    return res.json({ reviews });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function publishReviewAdmin(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const review = await Review.findById(id).exec();
    if (!review) return res.status(404).json({ error: 'No encontrado' });
    if (review.status === 'published') return res.json({ success: true, review });

    // Cambiar a published
    review.status = 'published';
    await review.save();

    // Borrar token de la order asociada
    try {
      await db.clearReviewToken(review.orderId);
      await db.markReviewTokenUsed(review.orderId).catch(()=>{});
    } catch (e) {
      console.warn('Could not clear/mark review token for order', review.orderId, e);
    }

    return res.json({ success: true, review });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function deleteReviewAdmin(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const review = await Review.findById(id).exec();
    if (!review) return res.status(404).json({ error: 'No encontrado' });

    // Borrar fotos en Cloudinary si las hubiera (están en carpeta cunao/reviews/:id)
    try {
      const folder = `cunao/reviews/${review._id}`;
      // delete resources by prefix
      await cloudinary.api.delete_resources_by_prefix(folder);
      // delete folder
      await cloudinary.api.delete_folder(folder).catch(()=>{});
    } catch (e) {
      console.warn('Cloudinary delete warning', e);
    }

    await Review.deleteOne({ _id: review._id }).exec();
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// Endpoint para crear review manualmente (admin)
export async function createReviewAdmin(req: Request, res: Response) {
  try {
    const { orderId, productId, rating, title, body, authorName } = req.body;
    if (!productId || !rating) return res.status(400).json({ error: 'productId y rating requeridos' });
    const review = new Review({ orderId: orderId || 'admin', productId, rating, title, body, authorName: authorName || 'Admin', photos: [], status: 'published' });
    await review.save();
    return res.json({ success: true, review });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}
