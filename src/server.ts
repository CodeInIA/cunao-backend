import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';

import { errorHandler } from './middleware/errorHandler.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import webhookRoutes from './routes/webhooks.js';
import configRoutes from './routes/config.js';
import contactRoutes from './routes/contact.js';
import newsletterRoutes from './routes/newsletter.js';
import analyticsRoutes from './routes/analytics.js';
import weeklyProductsRoutes from './routes/weeklyProducts.js';
import discountRoutes from './routes/discounts.js';
import imageRoutes from './routes/images.js';
import { db } from './services/databaseService.js';
import { startNewsletterScheduler } from './cron/weeklyNewsletter.js';
import { startNewProductsEmailScheduler } from './cron/weeklyNewProducts.js';

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
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/weekly-products', weeklyProductsRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/analytics', analyticsRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Cuñadismo Ilustrado API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Middlewares finales de manejo de errores y 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `No se puede encontrar ${req.originalUrl} en este servidor.`
  });
});
app.use(errorHandler);

app.set('trust proxy', 1);

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Cuñadismo Ilustrado ejecutándose en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);

  if (process.env.NODE_ENV === 'development') {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      const envFileContent = fs.readFileSync(envPath, { encoding: 'utf-8' });
      console.log('\n--- Variables de entorno cargadas desde .env ---');
      envFileContent.split(/\r?\n/).forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key] = trimmedLine.split('=');
          if (key && process.env[key]) {
            console.log(`${key}=${process.env[key]}`);
          }
        }
      });
      console.log('\n---------------------------------------------\n');
    } catch (error) {
      console.log('No se pudo leer el fichero .env para mostrar las variables.');
    }
  }
  
  // Inicializar scheduler de newsletter
  startNewsletterScheduler();
  
  // Inicializar scheduler de nuevos productos
  startNewProductsEmailScheduler();
});