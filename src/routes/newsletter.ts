import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ApiResponse } from '../types';
import * as crypto from 'crypto';
import * as mongoose from 'mongoose';
import Newsletter from '../models/Newsletter.js';
import { subscribeToNewsletter, sendManualNewsletter, addTestSubscriber, updateMarketingPreferences } from '../controllers/newsletterController.js';

const router = Router();

// Simulación de base de datos en memoria para tokens (en producción usar una base de datos real)
interface NewsletterSubscriber {
  email: string;
  preferences: {
    newsletterEnabled: boolean;
    marketingEnabled: boolean;
    productUpdates: boolean;
    offerAlerts: boolean;
    cuñaoTips: boolean;
  };
  lastToken?: string;
  tokenCreatedAt?: Date;
}

// En producción, esto debería estar en una base de datos
const subscribers = new Map<string, NewsletterSubscriber>();

// Generar token seguro para newsletter
export const generateNewsletterToken = (email: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString();
  const hash = crypto.createHmac('sha256', process.env.NEWSLETTER_SECRET || 'default-secret')
    .update(`${email}:${token}:${timestamp}`)
    .digest('hex');
  
  return `${token}.${timestamp}.${hash}`;
};

// Validar token de newsletter
const validateNewsletterToken = (token: string, email: string): boolean => {
  try {
    const [tokenPart, timestamp, hash] = token.split('.');
    
    if (!tokenPart || !timestamp || !hash) {
      return false;
    }
    
    // Verificar que el token no haya expirado (24 horas)
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    if (tokenAge > maxAge) {
      return false;
    }
    
    // Verificar hash
    const expectedHash = crypto.createHmac('sha256', process.env.NEWSLETTER_SECRET || 'default-secret')
      .update(`${email}:${tokenPart}:${timestamp}`)
      .digest('hex');
    
    return hash === expectedHash;
  } catch (error) {
    return false;
  }
};

// POST /api/newsletter/subscribe (mantener la ruta existente)
router.post('/subscribe', subscribeToNewsletter);

// Rutas para testing y administración
router.post('/send-manual', sendManualNewsletter);
router.post('/add-test-subscriber', addTestSubscriber);

// Nueva ruta para actualizar preferencias de marketing durante checkout
router.post('/update-marketing-preferences', [
  body('email').isEmail().withMessage('Email válido requerido'),
  body('acceptsMarketing').isBoolean().withMessage('acceptsMarketing debe ser un booleano')
], updateMarketingPreferences);

// Validar token de acceso
router.post('/validate-token', [
  body('token').notEmpty().withMessage('Token es requerido')
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Token es requerido'
    });
  }

  const { token } = req.body;

  try {
    // Buscar en la base de datos MongoDB todos los newsletters
    const newsletters = await Newsletter.find({ lastToken: { $exists: true, $ne: null } });

    let foundNewsletter = null;

    // Validar el token para cada email
    for (const newsletter of newsletters) {
      if (newsletter.lastToken === token && validateNewsletterToken(token, newsletter.email)) {
        foundNewsletter = newsletter;
        break;
      }
    }

    if (!foundNewsletter) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    // Verificar si el usuario es cliente (tiene órdenes)
    let isCustomer = false;
    
    try {
      // Verificar que mongoose esté conectado
      if (mongoose.connection.readyState !== 1) {
        console.log('MongoDB no está conectado, saltando verificación de cliente');
      } else {
        const collections = Object.keys(mongoose.connection.collections);
        if (collections.includes('orders')) {
          const ordersCollection = mongoose.connection.collections['orders'];
          const orders = await ordersCollection.findOne({ 
            $or: [
              { email: foundNewsletter.email },
              { customerEmail: foundNewsletter.email },
              { 'customer.email': foundNewsletter.email }
            ]
          });
          isCustomer = !!orders;
        }
      }
    } catch (error) {
      console.log('Error checking customer status:', error);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        valid: true,
        email: foundNewsletter.email,
        preferences: foundNewsletter.preferences,
        isCustomer: isCustomer
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error validating token:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}));

// Actualizar preferencias de newsletter
router.put('/update-preferences', [
  body('token').notEmpty().withMessage('Token es requerido'),
  body('preferences').isObject().withMessage('Preferencias son requeridas'),
  body('preferences.email').isEmail().withMessage('Email válido es requerido')
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos'
    });
  }

  const { token, preferences } = req.body;

  try {
    // Buscar en la base de datos MongoDB
    const newsletters = await Newsletter.find({ lastToken: { $exists: true, $ne: null } });

    let foundNewsletter = null;

    // Validar el token para cada email
    for (const newsletter of newsletters) {
      if (newsletter.lastToken === token && validateNewsletterToken(token, newsletter.email)) {
        foundNewsletter = newsletter;
        break;
      }
    }

    if (!foundNewsletter) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    // Verificar que el email del token coincida con el de las preferencias
    if (foundNewsletter.email !== preferences.email) {
      return res.status(403).json({
        success: false,
        error: 'No puedes modificar preferencias de otro email'
      });
    }

    // Actualizar preferencias en MongoDB (usando la estructura correcta del modelo)
    console.log('🔧 Actualizando preferencias para:', foundNewsletter.email);
    console.log('📝 Preferencias recibidas:', preferences);
    
    // Determinar los valores correctos para cada preferencia
    const newsletterValue = preferences.newsletter !== undefined ? preferences.newsletter : 
                           preferences.newsletterEnabled !== undefined ? preferences.newsletterEnabled : 
                           foundNewsletter.preferences.newsletter;
                           
    const promotionsValue = preferences.promotions !== undefined ? preferences.promotions :
                           preferences.marketingEnabled !== undefined ? preferences.marketingEnabled :
                           foundNewsletter.preferences.promotions;
                           
    const newProductsValue = preferences.newProducts !== undefined ? preferences.newProducts :
                            preferences.productUpdates !== undefined ? preferences.productUpdates :
                            foundNewsletter.preferences.newProducts;
    
    console.log('💾 Valores a guardar:');
    console.log('   Newsletter:', newsletterValue);
    console.log('   Promotions:', promotionsValue);
    console.log('   NewProducts:', newProductsValue);
    
    const updatedNewsletter = await Newsletter.findByIdAndUpdate(
      foundNewsletter._id,
      {
        $set: {
          'preferences.newsletter': newsletterValue,
          'preferences.promotions': promotionsValue,
          'preferences.newProducts': newProductsValue
        }
      },
      { new: true }
    );

    if (!updatedNewsletter) {
      return res.status(500).json({
        success: false,
        error: 'Error actualizando preferencias'
      });
    }

    console.log('✅ Preferencias actualizadas en DB:', updatedNewsletter.preferences);

    // También actualizar en memoria para compatibilidad con código existente
    const subscriber = subscribers.get(foundNewsletter.email);
    if (subscriber) {
      subscriber.preferences = {
        newsletterEnabled: newsletterValue,
        marketingEnabled: promotionsValue,
        productUpdates: newProductsValue,
        offerAlerts: preferences.offerAlerts !== undefined ? preferences.offerAlerts : false,
        cuñaoTips: preferences.cuñaoTips !== undefined ? preferences.cuñaoTips : true
      };
      subscribers.set(foundNewsletter.email, subscriber);
      console.log('✅ Preferencias actualizadas en memoria también');
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        message: 'Preferencias actualizadas correctamente',
        preferences: updatedNewsletter.preferences
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating preferences:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}));

// Darse de baja de todas las comunicaciones
router.post('/unsubscribe-all', [
  body('token').notEmpty().withMessage('Token es requerido')
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Token es requerido'
    });
  }

  const { token } = req.body;

  try {
    // Buscar en la base de datos MongoDB
    const newsletters = await Newsletter.find({ lastToken: { $exists: true, $ne: null } });

    let foundNewsletter = null;

    // Validar el token para cada email
    for (const newsletter of newsletters) {
      if (newsletter.lastToken === token && validateNewsletterToken(token, newsletter.email)) {
        foundNewsletter = newsletter;
        break;
      }
    }

    if (!foundNewsletter) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    // Desactivar todas las preferencias en MongoDB
    const updatedNewsletter = await Newsletter.findByIdAndUpdate(
      foundNewsletter._id,
      {
        $set: {
          'preferences.newsletter': false,
          'preferences.promotions': false,
          'preferences.newProducts': false
        }
      },
      { new: true }
    );

    if (!updatedNewsletter) {
      return res.status(500).json({
        success: false,
        error: 'Error actualizando preferencias'
      });
    }

    // También actualizar en memoria para compatibilidad
    const subscriber = subscribers.get(foundNewsletter.email);
    if (subscriber) {
      subscriber.preferences = {
        newsletterEnabled: false,
        marketingEnabled: false,
        productUpdates: false,
        offerAlerts: false,
        cuñaoTips: false
      };
      subscribers.set(foundNewsletter.email, subscriber);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        message: 'Te has dado de baja de todas las comunicaciones'
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}));

// Función helper para generar tokens cuando se envían emails
export const prepareNewsletterEmail = async (email: string): Promise<string> => {
  try {
    // Importar el modelo Newsletter
    // Generar nuevo token
    const token = generateNewsletterToken(email);
    
    // Buscar o crear el suscriptor en la base de datos
    const existingNewsletter = await Newsletter.findOne({ email: email.toLowerCase() });
    
    if (existingNewsletter) {
      // Actualizar el token del suscriptor existente
      existingNewsletter.lastToken = token;
      await existingNewsletter.save();
      console.log(`✅ Token actualizado en DB para: ${email}`);
    } else {
      // Crear nuevo suscriptor con el token
      const newNewsletter = new Newsletter({
        email: email.toLowerCase(),
        lastToken: token,
        preferences: {
          newsletter: true,
          promotions: true,
          newProducts: true
        }
      });
      await newNewsletter.save();
      console.log(`✅ Nuevo suscriptor creado en DB con token: ${email}`);
    }
    
    // También mantener en memoria para compatibilidad con código existente
    const subscriber = subscribers.get(email);
    if (!subscriber) {
      const newSubscriber: NewsletterSubscriber = {
        email,
        preferences: {
          newsletterEnabled: true,
          marketingEnabled: true,
          productUpdates: true,
          offerAlerts: false,
          cuñaoTips: true
        }
      };
      subscribers.set(email, newSubscriber);
    }
    
    const subscriberData = subscribers.get(email)!;
    subscriberData.lastToken = token;
    subscriberData.tokenCreatedAt = new Date();
    subscribers.set(email, subscriberData);
    
    return token;
  } catch (error) {
    console.error('❌ Error guardando token en DB para:', email, error);
    
    // Fallback: solo generar token y guardar en memoria
    const token = generateNewsletterToken(email);
    const subscriber = subscribers.get(email);
    if (!subscriber) {
      const newSubscriber: NewsletterSubscriber = {
        email,
        preferences: {
          newsletterEnabled: true,
          marketingEnabled: true,
          productUpdates: true,
          offerAlerts: false,
          cuñaoTips: true
        }
      };
      subscribers.set(email, newSubscriber);
    }
    
    const subscriberData = subscribers.get(email)!;
    subscriberData.lastToken = token;
    subscriberData.tokenCreatedAt = new Date();
    subscribers.set(email, subscriberData);
    
    return token;
  }
};

export default router;
