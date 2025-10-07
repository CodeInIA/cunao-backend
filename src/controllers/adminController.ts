import { Request, Response } from 'express';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { enrichReviewsWithProductInfo } from './reviewController.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../services/databaseService.js';
import crypto from 'crypto';
import sharp from 'sharp';
import printifyService from '../services/printifyService.js';
import DiscountCode from '../models/DiscountCode.js';
import Newsletter from '../models/Newsletter.js';
import { sendEmail } from '../services/emailService.js';
import { generateNewsletterToken } from '../routes/newsletter.js';

const JWT_SECRET = process.env.JWT_SECRET || 'please_change_me';

// Función para generar el HTML del email de descuento
function generateDiscountEmailHTML(
  discountPercentage: number,
  code: string,
  expiryText: string,
  customerName: string = '',
  preferencesUrl: string = '',
  maxUses?: number | null,
  appliesTo: 'subtotal' | 'shipping' = 'subtotal'
) {
  const greeting = customerName ? `¡Hola ${customerName}!` : '¡Hola cuñao!';
  const frontendUrl = process.env.FRONTEND_PRODUCTION_URL || 'https://www.cunadismoilustrado.me';
  const appliesToText = appliesTo === 'subtotal' ? 'el subtotal de tu compra' : 'los gastos de envío';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Descuento Exclusivo para Ti!</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: #1e293b;
            color: #ffffff;
            line-height: 1.6;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .header {
            text-align: center;
            padding: 40px 30px 30px;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        }
        
        .logo {
            width: 160px;
            height: 160px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        .brand-name {
            font-size: 32px;
            font-weight: 700;
            color: #fbbf24;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .content {
            padding: 40px 30px;
            text-align: center;
        }
        
        .greeting {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #fbbf24;
        }
        
        .discount-announcement {
            font-size: 18px;
            margin-bottom: 30px;
            color: #e2e8f0;
            line-height: 1.7;
        }
        
        .discount-highlight {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #1e293b;
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 20px;
        }
        
        .discount-code-container {
            background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
            border: 2px dashed #fbbf24;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            position: relative;
        }
        
        .discount-code {
            font-size: 32px;
            font-weight: 700;
            color: #fbbf24;
            letter-spacing: 3px;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .code-subtitle {
            font-size: 14px;
            color: #94a3b8;
        }
        
        .instructions {
            background: rgba(251, 191, 36, 0.1);
            border-left: 4px solid #fbbf24;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
            text-align: left;
        }
        
        .instructions h3 {
            color: #fbbf24;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .instructions ol {
            color: #e2e8f0;
            padding-left: 20px;
        }
        
        .instructions li {
            margin-bottom: 8px;
        }
        
        .buttons {
            margin: 40px 0;
        }
        
        .btn {
            display: inline-block;
            padding: 16px 32px;
            margin: 10px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            text-align: center;
            min-width: 200px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #1e293b;
            box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(251, 191, 36, 0.4);
        }
        
        .expiry-info {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #fca5a5;
        }
        
        .footer {
            background: #0f172a;
            padding: 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        
        .footer p {
            margin-bottom: 10px;
        }
        
        .footer a {
            color: #fbbf24;
            text-decoration: none;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 12px;
            }
            
            .header, .content {
                padding: 30px 20px;
            }
            
            .discount-code {
                font-size: 24px;
                letter-spacing: 2px;
            }
            
            .btn {
                display: block;
                margin: 15px 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="${frontendUrl}/logo-sin-letras.png" alt="Cuñadismo Ilustrado Logo" />
            </div>
            <div class="brand-name">Cuñadismo Ilustrado</div>
        </div>
        
        <div class="content">
            <div class="greeting">${greeting}</div>
            
            <div class="discount-announcement">
                ¡Tenemos algo especial para ti!<br><br>Disfruta de un 
                <span class="discount-highlight">${discountPercentage}% de descuento</span>
                en ${appliesToText} de toda nuestra colección de camisetas cuñao.
            </div>
            
            <div class="discount-code-container">
                <div class="discount-code">${code}</div>
                <div class="code-subtitle">Tu código de descuento exclusivo</div>
            </div>
            
            ${expiryText !== 'Permanente' ? `
            <div class="expiry-info">
                ⏰ <strong>¡Atención!</strong> Este descuento ${expiryText}
            </div>
            ` : ''}
            
            ${maxUses !== null && maxUses !== undefined ? `
            <div class="expiry-info" style="background: rgba(251, 191, 36, 0.1); border-color: #fbbf24; color: #fbbf24;">
                🏃‍♂️ <strong>¡Date prisa!</strong> Solo las primeras <strong>${maxUses} personas</strong> que hagan una compra podrán usar este descuento exclusivo.
            </div>
            ` : ''}
            
            <div class="instructions">
                <h3>🛒 Cómo usar tu descuento:</h3>
                <ol>
                    <li>Visita nuestra tienda y elige tus camisetas favoritas</li>
                    <li>Ve al carrito de compras</li>
                    <li>En el checkout, introduce el código <strong>${code}</strong></li>
                    <li>¡Disfruta tu descuento y presume de cuñao auténtico!</li>
                </ol>
            </div>
            
            <div class="buttons">
                <a href="${frontendUrl}/productos" class="btn btn-primary">
                    🛍️ Ver Productos
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>Has recibido este email porque aceptaste recibir promociones.</p>
            ${preferencesUrl ? `<p><a href="${preferencesUrl}">Gestionar preferencias de email</a></p>` : ''}
            <p>© 2025 Cuñadismo Ilustrado - La marca del cuñao auténtico</p>
        </div>
    </div>
</body>
</html>`;
}

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
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined; // e.g. '.cunadismoilustrado.me'


    const baseCookieOptions: any = {
      secure,
      sameSite: sameSiteVal,
      maxAge: 12 * 60 * 60 * 1000,
      path: '/'
    };
    if (cookieDomain) baseCookieOptions.domain = cookieDomain;

    res.cookie('adminToken', token, {
      ...baseCookieOptions,
      httpOnly: true
    });
    res.cookie('csrfToken', csrfToken, {
      ...baseCookieOptions,
      httpOnly: false
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
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
  const clearOpts: any = { path: '/', secure, sameSite: sameSiteVal };
  if (cookieDomain) clearOpts.domain = cookieDomain;
  res.clearCookie('adminToken', clearOpts);
  res.clearCookie('csrfToken', clearOpts);
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
    const enriched = await enrichReviewsWithProductInfo(reviews as any[]);
    return res.json({ reviews: enriched });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// Listar productos (solo para admin) - devuelve imagen principal, title y tags
export async function listProductsAdmin(req: Request, res: Response) {
  try {
    const limit = Number(req.query.limit) || 200;
    const products = await db.getProducts(limit);
    // mapear solo campos necesarios
    const out = products.map(p => ({
      id: p.printifyId,
      title: p.title,
      tags: p.tags || [],
      image: Array.isArray(p.images) && p.images.length > 0 ? p.images.find((i: any) => i.is_default) || p.images[0] : null
    }));
    return res.json({ success: true, data: out });
  } catch (e) {
    console.error('listProductsAdmin error', e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// Actualizar tags de producto: llama a Printify y si OK actualiza MongoDB
export async function updateProductTagsAdmin(req: Request, res: Response) {
  try {
    const id = req.params.id; // printify product id
    const tags = req.body && Array.isArray(req.body.tags) ? req.body.tags.map(String) : null;
    if (!tags) return res.status(400).json({ error: 'tags array required' });

    // Llamar a Printify
    try {
      const ok = await printifyService.getInstance().updateProductTags(id, tags);
      if (!ok) {
        console.error('Printify update tags returned not-ok');
        return res.status(502).json({ error: 'Error updating printify product' });
      }
    } catch (e: any) {
      console.error('Error calling Printify to update tags', e.response?.data || e.message || e);
      return res.status(502).json({ error: 'Error updating printify product', details: e.response?.data || e.message });
    }

    // Si llegó aquí, actualizamos en DB
    try {
      await db.updateProductTags(id, tags);
    } catch (err) {
      console.error('Error updating DB tags', err);
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('updateProductTagsAdmin error', e);
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
    const { orderId, productId, rating, title, body, authorName, status, color, size, quantity, variantId } = req.body;
    if (!productId || !rating) return res.status(400).json({ error: 'productId y rating requeridos' });
    const reviewData: any = {
      orderId: orderId || 'admin',
      productId,
      rating: Number(rating),
      title,
      body,
      authorName: authorName || 'Admin',
      photos: [],
      status: status === 'published' ? 'published' : 'pending'
    };

    // Optionally include product metadata if provided from the admin form
    if (color) reviewData.color = String(color);
    if (size) reviewData.size = String(size);
    if (quantity !== undefined && quantity !== null && quantity !== '') reviewData.quantity = Number(quantity);
    if (variantId) reviewData.variantId = String(variantId);

    const review = new Review(reviewData);
    await review.save();

    // Procesar imágenes si vienen (upload.any en la ruta)
    const files: any[] = (req as any).files ? (Array.isArray((req as any).files) ? (req as any).files : Object.values((req as any).files).flat()) : [];
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    const photoUrls: string[] = [];
    for (const [idx, f] of files.slice(0,5).entries()) {
      const mimetype = (f.mimetype || '').toString().toLowerCase();
      if (!allowedMime.includes(mimetype)) continue;
      const webpBuffer = await sharp(f.buffer).webp({ quality: 75 }).toBuffer();
      try {
        const uploadResult = await cloudinary.uploader.upload(`data:image/webp;base64,${webpBuffer.toString('base64')}`, {
          folder: `cunao/reviews/${review._id}`,
          public_id: `review_${review._id}_img_${idx}`,
          format: 'webp',
          overwrite: true,
          resource_type: 'image'
        });
        if (uploadResult && uploadResult.secure_url) photoUrls.push(uploadResult.secure_url);
      } catch (e) {
        console.warn('Cloudinary upload admin create warning', e);
      }
    }
    if (photoUrls.length > 0) {
      review.photos = photoUrls;
      await review.save();
    }

    return res.json({ success: true, review });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// Discount code management endpoints
export async function listDiscountCodesAdmin(req: Request, res: Response) {
  try {
    const discountCodes = await DiscountCode.find({})
      .sort({ createdAt: -1 });

    const codesWithStatus = discountCodes.map(code => ({
      _id: code._id,
      code: code.code,
      discountPercentage: code.discountPercentage,
      expiryDate: code.expiryDate,
      isActive: code.isActive,
      appliesTo: code.appliesTo,
      maxUses: code.maxUses,
      usedCount: code.usedCount,
      createdAt: code.createdAt,
      updatedAt: code.updatedAt,
      isValid: code.isValid()
    }));

    return res.json({ success: true, discountCodes: codesWithStatus });
  } catch (e) {
    console.error('Error listing discount codes:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function createDiscountCodeAdmin(req: Request, res: Response) {
  try {
    const { code, discountPercentage, expiryDate, isActive, appliesTo, maxUses, sendEmail: sendEmailToSubscribers, customEmails } = req.body;
    
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'El código es requerido' });
    }
    
    if (!discountPercentage || discountPercentage < 1 || discountPercentage > 100) {
      return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' });
    }

    const discountData: any = {
      code: code.trim().toUpperCase(),
      discountPercentage: Number(discountPercentage),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      appliesTo: appliesTo || 'subtotal',
      usedCount: 0
    };

    if (expiryDate) {
      const date = new Date(expiryDate);
      if (date <= new Date()) {
        return res.status(400).json({ error: 'La fecha de expiración debe ser futura' });
      }
      discountData.expiryDate = date;
    }

    if (maxUses !== undefined && maxUses !== null) {
      const uses = Number(maxUses);
      if (!Number.isInteger(uses) || uses < 1) {
        return res.status(400).json({ error: 'El número máximo de usos debe ser un número entero positivo' });
      }
      discountData.maxUses = uses;
    }

    const discountCode = new DiscountCode(discountData);
    await discountCode.save();

    // Preparar respuesta base
    const responseData: any = {
      _id: discountCode._id,
      code: discountCode.code,
      discountPercentage: discountCode.discountPercentage,
      expiryDate: discountCode.expiryDate,
      isActive: discountCode.isActive,
      appliesTo: discountCode.appliesTo,
      maxUses: discountCode.maxUses,
      usedCount: discountCode.usedCount,
      createdAt: discountCode.createdAt,
      updatedAt: discountCode.updatedAt,
      isValid: discountCode.isValid()
    };

    // Si se solicitó enviar emails
    if (sendEmailToSubscribers) {
      let emailsSent = 0;
      let emailsFailed = 0;
      let emailsToSend: string[] = [];

      try {
        // Determinar lista de emails
        if (customEmails && Array.isArray(customEmails) && customEmails.length > 0) {
          // Usar lista personalizada
          emailsToSend = customEmails.map((email: string) => email.trim()).filter((email: string) => email);
          console.log(`📧 Enviando cupón a lista personalizada de ${emailsToSend.length} emails...`);
        } else {
          // Obtener suscriptores con promociones activadas
          const subscribers = await Newsletter.find({
            'preferences.promotions': true
          });
          emailsToSend = subscribers.map(s => s.email);
          console.log(`📧 Enviando cupón a ${emailsToSend.length} suscriptores...`);
        }

        // Preparar texto de expiración
        const expiryText = discountCode.expiryDate 
          ? `expira el ${new Date(discountCode.expiryDate).toLocaleDateString('es-ES')}`
          : 'Permanente';

        const frontendUrl = process.env.FRONTEND_PRODUCTION_URL || process.env.FRONTEND_URL || 'https://www.cunadismoilustrado.me';

        // Enviar emails
        for (const email of emailsToSend) {
          try {
            let preferencesUrl = '';
            
            // Si es un suscriptor en la BD, generar URL de preferencias
            const subscriber = await Newsletter.findOne({ email });
            if (subscriber) {
              const token = generateNewsletterToken(email);
              subscriber.lastToken = token;
              await subscriber.save();
              preferencesUrl = `${frontendUrl}/newsletter/preferences?token=${token}`;
            }

            const emailHTML = generateDiscountEmailHTML(
              discountCode.discountPercentage,
              discountCode.code,
              expiryText,
              '',
              preferencesUrl,
              discountCode.maxUses,
              discountCode.appliesTo
            );
            
            await sendEmail({
              to: email,
              subject: `🎉 ¡${discountCode.discountPercentage}% de descuento exclusivo para ti!`,
              html: emailHTML
            });
            
            emailsSent++;
            console.log(`✅ Email enviado a: ${email}`);
            
          } catch (error) {
            emailsFailed++;
            console.error(`❌ Error enviando email a ${email}:`, error);
          }
        }

        // Añadir estadísticas de envío a la respuesta
        responseData.emailStats = {
          sent: emailsSent,
          failed: emailsFailed,
          total: emailsToSend.length
        };

        console.log(`📊 Emails enviados: ${emailsSent}, fallidos: ${emailsFailed}`);

      } catch (emailError) {
        console.error('Error en el proceso de envío de emails:', emailError);
        // No fallar la creación del cupón si falla el envío de emails
        responseData.emailStats = {
          sent: 0,
          failed: 0,
          total: 0,
          error: 'Error al enviar emails'
        };
      }
    }

    return res.json({ 
      success: true, 
      discountCode: responseData
    });
  } catch (e: any) {
    console.error('Error creating discount code:', e);
    if (e.code === 11000) {
      return res.status(400).json({ error: 'El código ya existe' });
    }
    if (e.name === 'ValidationError') {
      const messages = Object.values(e.errors).map((err: any) => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function updateDiscountCodeAdmin(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const { code, discountPercentage, expiryDate, isActive, appliesTo, maxUses } = req.body;

    const discountCode = await DiscountCode.findById(id);
    if (!discountCode) {
      return res.status(404).json({ error: 'Código no encontrado' });
    }

    if (code && code.trim()) {
      discountCode.code = code.trim().toUpperCase();
    }

    if (discountPercentage !== undefined) {
      if (discountPercentage < 1 || discountPercentage > 100) {
        return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' });
      }
      discountCode.discountPercentage = Number(discountPercentage);
    }

    if (expiryDate !== undefined) {
      if (expiryDate === null || expiryDate === '') {
        discountCode.expiryDate = undefined;
      } else {
        const date = new Date(expiryDate);
        if (date <= new Date()) {
          return res.status(400).json({ error: 'La fecha de expiración debe ser futura' });
        }
        discountCode.expiryDate = date;
      }
    }

    if (isActive !== undefined) {
      discountCode.isActive = Boolean(isActive);
    }

    if (appliesTo !== undefined) {
      discountCode.appliesTo = appliesTo;
    }

    if (maxUses !== undefined) {
      if (maxUses === null || maxUses === '') {
        discountCode.maxUses = null;
      } else {
        const maxUsesNum = Number(maxUses);
        if (!Number.isInteger(maxUsesNum) || maxUsesNum < 1) {
          return res.status(400).json({ error: 'El número máximo de usos debe ser un entero positivo' });
        }
        
        // Validar que maxUses no sea menor que usedCount
        if (maxUsesNum < discountCode.usedCount) {
          return res.status(400).json({ 
            error: `El número máximo de usos no puede ser menor que los usos actuales (${discountCode.usedCount})` 
          });
        }
        
        discountCode.maxUses = maxUsesNum;
      }
    }

    await discountCode.save();

    return res.json({ 
      success: true, 
      discountCode: {
        _id: discountCode._id,
        code: discountCode.code,
        discountPercentage: discountCode.discountPercentage,
        expiryDate: discountCode.expiryDate,
        isActive: discountCode.isActive,
        appliesTo: discountCode.appliesTo,
        maxUses: discountCode.maxUses,
        usedCount: discountCode.usedCount,
        createdAt: discountCode.createdAt,
        updatedAt: discountCode.updatedAt,
        isValid: discountCode.isValid()
      }
    });
  } catch (e: any) {
    console.error('Error updating discount code:', e);
    if (e.code === 11000) {
      return res.status(400).json({ error: 'El código ya existe' });
    }
    if (e.name === 'ValidationError') {
      const messages = Object.values(e.errors).map((err: any) => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function deleteDiscountCodeAdmin(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const discountCode = await DiscountCode.findById(id);
    
    if (!discountCode) {
      return res.status(404).json({ error: 'Código no encontrado' });
    }

    await DiscountCode.deleteOne({ _id: discountCode._id });
    return res.json({ success: true });
  } catch (e) {
    console.error('Error deleting discount code:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function listNewsletterSubscribers(req: Request, res: Response) {
  try {
    const subscribers = await Newsletter.find({})
      .select('email preferences createdAt')
      .sort({ createdAt: -1 });

    const subscribersData = subscribers.map(sub => ({
      email: sub.email,
      preferences: sub.preferences,
      createdAt: sub.createdAt,
      hasPromotions: sub.preferences?.promotions || false
    }));

    return res.json({ 
      success: true, 
      subscribers: subscribersData,
      total: subscribersData.length
    });
  } catch (e) {
    console.error('Error fetching newsletter subscribers:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

