import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';


import { errorHandler } from './middleware/errorHandler.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import webhookRoutes from './routes/webhooks.js';
import configRoutes from './routes/config.js';
import { db } from './services/databaseService.js';

dotenv.config();

db.connect();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares de seguridad y rendimiento (se aplican a todo) ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.'
});
app.use(helmet());
app.use(compression());
app.use(limiter);

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200
}));

// --- INICIO DE LA CORRECCIÓN ---

// 1. Ruta de Webhooks PRIMERO.
//    Stripe y Printify necesitan el 'raw body'. Usamos express.raw() solo para esta ruta
//    y le pasamos directamente el router de webhooks para que se encargue.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// 2. Middleware para parsear JSON DESPUÉS.
//    Esto se aplicará a todas las demás rutas que sí necesitan un body en formato JSON.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- FIN DE LA CORRECCIÓN ---

// Resto de las rutas que SÍ usan el parser de JSON
app.use('/api/config', configRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Cuñadismo Ilustrado API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Middlewares finales de manejo de errores y 404
app.use(errorHandler);
app.all('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `No se puede encontrar ${req.originalUrl} en este servidor.`
  });
});

app.set('trust proxy', 1);

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Cuñadismo Ilustrado ejecutándose en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});