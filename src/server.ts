import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Nota: en archivos TypeScript no añadimos la extensión .js para evitar errores ts(2307)
import { errorHandler } from './middleware/errorHandler';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import webhookRoutes from './routes/webhooks';
import configRoutes from './routes/config';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por ventana de tiempo por IP
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.'
});

// Middleware de seguridad
app.use(helmet());
app.use(compression());
app.use(limiter);

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Middleware para webhooks (raw body)
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// Rutas de configuración (shipping costs, threshold, etc)
app.use('/api/config', configRoutes);

// Middleware para JSON (después de webhooks)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Cuñadismo Ilustrado API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Middleware de manejo de errores
app.use(errorHandler);

// Manejador para rutas no encontradas
app.all('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `No se puede encontrar ${req.originalUrl} en este servidor.`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Cuñadismo Ilustrado ejecutándose en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});
