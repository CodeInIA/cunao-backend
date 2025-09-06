import WeeklyProduct, { IWeeklyProduct } from '../models/WeeklyProducts.js';
import Newsletter, { INewsletter } from '../models/Newsletter.js';
import { sendEmail } from '../services/emailService.js';
import { generateNewsletterToken } from '../routes/newsletter.js';

interface NewProductsSubscriber {
  email: string;
  preferences: {
    newsletter: boolean;
    promotions: boolean;
    newProducts: boolean;
  };
}

// Función para obtener la semana del año en formato ISO
const getWeekYear = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const daysSinceStartOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((daysSinceStartOfYear + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

// Función para generar el contenido HTML del email de nuevos productos
const generateNewProductsEmailContent = (products: IWeeklyProduct[], preferencesUrl?: string) => {
  const config = {
    frontend: {
      url: 'https://cunadismoilustrado.me'
    }
  };

  // Tomar máximo 3 productos más recientes
  const featuredProducts = products.slice(0, 3);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuevos Lanzamientos - Cuñadismo Ilustrado</title>
        <style>
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            body { 
                font-family: 'Arial', sans-serif; 
                line-height: 1.6; 
                background-color: #1e293b;
                padding: 20px;
            }
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #1e293b;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            }
            .header { 
                background-color: #1e293b;
                color: white; 
                padding: 40px 30px 30px 30px; 
                text-align: center; 
            }
            .logo {
                width: 120px;
                height: 120px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .logo img {
                width: 120px;
                height: 120px;
                object-fit: contain;
            }
            .brand-name {
                color: #F1BF00;
                font-size: 28px;
                font-weight: bold;
                margin: 0 0 10px 0;
                letter-spacing: 1px;
            }
            .subtitle {
                color: #94a3b8;
                font-size: 16px;
                font-weight: normal;
                margin: 0;
                letter-spacing: 0.5px;
            }
            .content {
                padding: 30px;
                text-align: center;
                background-color: #1e293b;
            }
            .intro-text {
                color: #94a3b8;
                font-size: 18px;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .products-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 20px;
                margin: 30px 0;
                max-width: 500px;
                margin-left: auto;
                margin-right: auto;
            }
            .product-card {
                background: #334155;
                border-radius: 12px;
                padding: 15px;
                text-align: center;
                border: 2px solid #475569;
                transition: all 0.3s ease;
            }
            .product-card:hover {
                border-color: #F1BF00;
                transform: translateY(-2px);
            }
            .product-image {
                width: 100%;
                height: 120px;
                object-fit: cover;
                border-radius: 8px;
                margin-bottom: 10px;
            }
            .product-title {
                color: #F1BF00;
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 5px;
                line-height: 1.3;
            }
            .product-price {
                color: #94a3b8;
                font-size: 13px;
                font-weight: 600;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #F1BF00, #D1A000);
                color: #1e293b !important;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                margin: 30px 0 20px 0;
                box-shadow: 0 4px 12px rgba(241, 191, 0, 0.3);
                transition: all 0.3s ease;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(241, 191, 0, 0.4);
            }
            .preferences-link {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #334155;
            }
            .preferences-link a {
                color: #94a3b8;
                text-decoration: none;
                font-size: 14px;
            }
            .preferences-link a:hover {
                color: #F1BF00;
                text-decoration: underline;
            }
            
            /* Responsive */
            @media (max-width: 600px) {
                body { padding: 10px; }
                .header { padding: 30px 20px 20px 20px; }
                .content { padding: 20px; }
                .brand-name { font-size: 24px; }
                .products-grid { grid-template-columns: 1fr; }
                .cta-button { padding: 14px 28px; font-size: 15px; }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <div class="logo">
                    <img src="https://cunadismoilustrado.me/logo-sin-letras.png" alt="Cuñadismo Ilustrado" />
                </div>
                <h1 class="brand-name">CUÑADISMO ILUSTRADO</h1>
                <p class="subtitle">Nuevos Lanzamientos de la Semana</p>
            </div>

            <!-- Content -->
            <div class="content">
                <p class="intro-text">
                    ¡Tenemos novedades cuñao! 🚀<br>
                    Estas son las últimas incorporaciones a nuestra colección de camisetas más auténticas de España.
                </p>
                
                <!-- Products Grid -->
                <div class="products-grid">
                    ${featuredProducts.map(product => `
                        <div class="product-card">
                            <img src="${product.imageUrl}" alt="${product.title}" class="product-image" />
                            <div class="product-title">${product.title}</div>
                            <div class="product-price">${product.price}€</div>
                        </div>
                    `).join('')}
                </div>
                
                <a href="${config.frontend.url}/productos" class="cta-button">
                    🔥 Descubre los Nuevos Lanzamientos de Esta Semana
                </a>
                
                <p style="color: #64748b; margin-top: 20px; font-size: 14px; font-style: italic;">
                    "Porque ser cuñao también es estar siempre a la última" 💪
                </p>

                ${preferencesUrl ? `
                <div class="preferences-link">
                    <a href="${preferencesUrl}">
                        Gestionar preferencias de email
                    </a>
                </div>
                ` : ''}
            </div>
        </div>
    </body>
    </html>
  `;
};

// Función para obtener suscriptores con newProducts activado
const getNewProductsSubscribers = async (): Promise<NewProductsSubscriber[]> => {
  try {
    const subscribers = await Newsletter.find({
      'preferences.newProducts': true
    }).lean();
    
    console.log(`📧 Encontrados ${subscribers.length} suscriptores con nuevos productos activado`);
    
    return subscribers.map(sub => ({
      email: sub.email,
      preferences: {
        newsletter: sub.preferences?.newsletter || false,
        promotions: sub.preferences?.promotions || false,
        newProducts: sub.preferences?.newProducts || true
      }
    }));
  } catch (error) {
    console.error('❌ Error obteniendo suscriptores de nuevos productos:', error);
    return [];
  }
};

// Función para obtener productos de la semana actual
const getWeeklyProducts = async (weekYear?: string): Promise<IWeeklyProduct[]> => {
  try {
    const targetWeek = weekYear || getWeekYear();
    
    const products = await WeeklyProduct.find({ weekYear: targetWeek })
      .sort({ publishedAt: -1 }) // Más recientes primero
      .limit(10) // Máximo 10 productos por semana
      .lean();
    
    console.log(`📦 Encontrados ${products.length} productos para la semana ${targetWeek}`);
    return products;
  } catch (error) {
    console.error('❌ Error obteniendo productos semanales:', error);
    return [];
  }
};

// Función principal para enviar emails de nuevos productos
export const sendWeeklyNewProductsEmail = async (): Promise<void> => {
  try {
    console.log('📧 Iniciando envío de email de nuevos productos...');
    
    // Obtener productos de la semana actual
    const currentWeek = getWeekYear();
    const weeklyProducts = await getWeeklyProducts(currentWeek);
    
    if (weeklyProducts.length === 0) {
      console.log(`📦 No hay productos nuevos para la semana ${currentWeek}. No se enviará email.`);
      return;
    }
    
    // Obtener suscriptores con newProducts activado
    const subscribers = await getNewProductsSubscribers();
    
    if (subscribers.length === 0) {
      console.log('📧 No hay suscriptores con nuevos productos activado');
      return;
    }

    console.log(`📧 Enviando email de nuevos productos a ${subscribers.length} suscriptores...`);
    console.log(`📦 Productos destacados: ${weeklyProducts.slice(0, 3).map(p => p.title).join(', ')}`);
    
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const subscriber of subscribers) {
      try {
        // Generar token de autenticación para preferencias
        const token = generateNewsletterToken(subscriber.email);
        
        // Actualizar token en la base de datos
        const updateResult = await Newsletter.updateOne(
          { email: subscriber.email },
          { lastToken: token }
        );
        
        if (updateResult.matchedCount === 0) {
          console.warn(`⚠️ No se encontró el suscriptor ${subscriber.email} para actualizar token`);
          emailsFailed++;
          continue;
        }
        
        // Verificar que el token se guardó correctamente
        const updatedSubscriber = await Newsletter.findOne({ email: subscriber.email });
        if (!updatedSubscriber || updatedSubscriber.lastToken !== token) {
          console.error(`❌ Error guardando token para ${subscriber.email}`);
          emailsFailed++;
          continue;
        }
        
        // Generar URL de preferencias con el token verificado
        const preferencesUrl = `https://cunadismoilustrado.me/newsletter/preferences?token=${token}`;
        
        // Generar contenido del email
        const emailContent = generateNewProductsEmailContent(weeklyProducts, preferencesUrl);
        
        // Enviar email
        await sendEmail({
          to: subscriber.email,
          subject: '🔥 Nuevos Lanzamientos Cuñao - Esta Semana',
          html: emailContent
        });
        
        emailsSent++;
        console.log(`✅ Email de nuevos productos enviado a: ${subscriber.email}`);
        
        // Pequeña pausa para no sobrecargar el servicio de email
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        emailsFailed++;
        console.error(`❌ Error enviando email de nuevos productos a ${subscriber.email}:`, error);
      }
    }
    
    console.log(`📧 Email de nuevos productos completado: ${emailsSent} enviados, ${emailsFailed} fallidos`);
    
    // Opcional: Marcar productos como enviados (agregar campo emailSent)
    await WeeklyProduct.updateMany(
      { weekYear: currentWeek },
      { $set: { emailSent: true, emailSentAt: new Date() } }
    );
    
  } catch (error) {
    console.error('❌ Error en envío de email de nuevos productos:', error);
  }
};

// Función para agregar un producto a la colección semanal
export const addWeeklyProduct = async (productData: {
  productId: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  printifyProductId: string;
  tags?: string[];
}): Promise<boolean> => {
  try {
    const currentWeek = getWeekYear();
    
    // Verificar si ya existe
    const existingProduct = await WeeklyProduct.findOne({ 
      productId: productData.productId 
    });
    
    if (existingProduct) {
      console.log(`📦 Producto ${productData.productId} ya existe en productos semanales`);
      return true;
    }

    // Crear nuevo producto semanal
    const newWeeklyProduct = new WeeklyProduct({
      ...productData,
      weekYear: currentWeek,
      tags: productData.tags || []
    });

    await newWeeklyProduct.save();
    console.log(`✅ Producto agregado a productos semanales: ${productData.title} (Semana: ${currentWeek})`);
    return true;
  } catch (error) {
    console.error(`❌ Error agregando producto semanal:`, error);
    return false;
  }
};

// Función para envío manual de email de nuevos productos
export const sendNewProductsEmailManual = async (): Promise<void> => {
  console.log('📧 Enviando email de nuevos productos manual...');
  await sendWeeklyNewProductsEmail();
};

// Scheduler para envío automático de email de nuevos productos
export const startNewProductsEmailScheduler = (): void => {
  console.log('🕒 Iniciando scheduler de email de nuevos productos...');
  
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    // Cada 10 segundos en desarrollo
    setInterval(async () => {
      console.log('📧 [DEV] Enviando email de nuevos productos de prueba...');
      await sendWeeklyNewProductsEmail();
    }, 1 * 10 * 1000); // 10 segundos

    console.log('🕒 Email de nuevos productos scheduler configurado para desarrollo (cada 10 segundos)');
  } else {
    // Cada domingo a las 18:00 en producción
    setInterval(async () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = domingo
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      // Solo enviar los domingos a las 18:00
      if (dayOfWeek === 0 && hour === 18 && minute < 5) {
        console.log('📧 [PROD] Enviando email semanal de nuevos productos (domingo 18:00)...');
        await sendWeeklyNewProductsEmail();
      }
    }, 5 * 60 * 1000); // Revisar cada 5 minutos
    
    console.log('🕒 Email de nuevos productos scheduler configurado para producción (domingos 18:00)');
  }
};
