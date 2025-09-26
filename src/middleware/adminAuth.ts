import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { RequestHandler } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'please_change_me';

export interface AuthRequest extends Request {
  user?: any;
}

export async function adminAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = (req.headers.authorization || '') as string;
    let token: string | undefined;
    if (authHeader.startsWith('Bearer ')) token = authHeader.slice(7).trim();
    // fallback to x-admin-token header
    if (!token) token = (req.headers['x-admin-token'] as string) || undefined;
    // fallback to cookie adminToken
    if (!token && (req as any).cookies) token = (req as any).cookies['adminToken'];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.userId) return res.status(401).json({ error: 'Invalid token' });

    const user = await User.findById(decoded.userId).exec();
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    req.user = { id: user._id, email: user.email, role: user.role };
    next();
  } catch (e: any) {
    return res.status(401).json({ error: 'Unauthorized', detail: e && e.message ? e.message : String(e) });
  }
}

// Middleware para protección CSRF (double-submit cookie)
export const csrfProtection: RequestHandler = (req, res, next) => {
  const method = req.method.toUpperCase();
  // Solo validar en métodos que mutan estado
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const cookieToken = (req as any).cookies?.csrfToken;
    const headerToken = (req.headers['x-csrf-token'] as string) || (req.headers['x-xsrf-token'] as string) || undefined;
    if (!cookieToken || !headerToken) return res.status(403).json({ error: 'CSRF token missing' });
    if (cookieToken !== headerToken) return res.status(403).json({ error: 'CSRF token mismatch' });
  }
  next();
};
