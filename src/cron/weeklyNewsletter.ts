import cron from 'node-cron';
import { sendNewsletterEmail, generatePreferencesUrl } from '../services/emailService.js';
import Newsletter from '../models/Newsletter.js';
import Client from '../models/Client.js';

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

interface Customer {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

// Base de datos simulada de suscriptores (en producción usar base de datos real)
// En el futuro esto debería integrarse con la base de datos principal
const newsletterSubscribers = new Map<string, NewsletterSubscriber>();

// Contenido base de la newsletter semanal
const generateNewsletterContent = (customerName?: string, preferencesUrl?: string) => {
  const greeting = customerName ? `¡Hola ${customerName}!` : '¡Hola cuñao!';
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Newsletter Semanal - Cuñadismo Ilustrado</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #f8f9fa;
                padding: 20px;
            }
            .container {
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header { 
                background: linear-gradient(135deg, #C41E3A, #FFD700); 
                color: white; 
                padding: 30px 20px; 
                text-align: center; 
            }
            .header h1 { 
                margin: 0; 
                font-size: 28px; 
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .content { 
                padding: 30px 20px; 
            }
            .greeting {
                font-size: 18px;
                color: #C41E3A;
                font-weight: bold;
                margin-bottom: 20px;
            }
            .section {
                margin-bottom: 30px;
                padding: 20px;
                border-left: 4px solid #FFD700;
                background-color: #f8f9fa;
                border-radius: 0 8px 8px 0;
            }
            .section h2 {
                color: #C41E3A;
                margin-top: 0;
                font-size: 20px;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #C41E3A, #a01729);
                color: white !important;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
                box-shadow: 0 4px 15px rgba(196, 30, 58, 0.3);
                transition: transform 0.2s;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(196, 30, 58, 0.4);
            }
            .products-section {
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                padding: 25px;
                border-radius: 10px;
                text-align: center;
                margin: 20px 0;
            }
            .footer {
                background-color: #2c3e50;
                color: white;
                padding: 25px 20px;
                text-align: center;
                font-size: 12px;
            }
            .footer a {
                color: #FFD700;
                text-decoration: none;
            }
            .footer a:hover {
                text-decoration: underline;
            }
            .quote {
                font-style: italic;
                text-align: center;
                color: #6c757d;
                border-left: 3px solid #FFD700;
                padding-left: 15px;
                margin: 20px 0;
            }
            .highlight {
                background-color: #fff3cd;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #ffeaa7;
                margin: 15px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>🇪🇸 CUÑADISMO ILUSTRADO 🇪🇸</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Newsletter Semanal del Cuñao</p>
            </div>

            <!-- Content -->
            <div class="content">
                <div class="greeting">${greeting}</div>
                
                <p>¡Bienvenido a otro episodio del newsletter más cuñao de España! Esta semana traemos noticias frescas, opiniones contundentes y por supuesto, las camisetas que necesitas para dominar cualquier conversación de bar.</p>

                <!-- Frase de la Semana -->
                <div class="section">
                    <h2>💬 Frase Cuñao de la Semana</h2>
                    <div class="quote">
                        "En mis tiempos, los jóvenes respetaban a los mayores y las camisetas duraban para toda la vida"
                    </div>
                    <p><strong>Origen:</strong> Paco, 58 años, veterano del bar "El Rincón" de Cuenca</p>
                    <div class="highlight">
                        <strong>💡 Tip cuñao:</strong> Úsala cuando alguien se queje de la calidad de algo moderno. Efectividad garantizada en reuniones familiares.
                    </div>
                </div>

                <!-- Noticias Cuñaos -->
                <div class="section">
                    <h2>📰 Noticias del Mundo Cuñao</h2>
                    <ul style="text-align: left;">
                        <li><strong>Récord:</strong> Un cuñado de Albacete logra mantener una opinión sobre fútbol durante 47 minutos sin interrupciones</li>
                        <li><strong>Investigación:</strong> Científicos confirman que llevar camiseta con mensaje polémico aumenta un 73% las posibilidades de iniciar debate</li>
                        <li><strong>Tendencia:</strong> Los mensajes sobre "los jóvenes de ahora" siguen siendo los más populares del mes</li>
                    </ul>
                </div>

                <!-- Consejo Semanal -->
                <div class="section">
                    <h2>🎯 Consejo Cuñao de la Semana</h2>
                    <p><strong>Tema:</strong> Cómo dominar una conversación sobre el tiempo</p>
                    <p>Esta semana te enseñamos el arte de convertir cualquier comentario meteorológico en una opinión contundente. Frases clave:</p>
                    <ul style="text-align: left;">
                        <li>"Antes los inviernos sí que eran inviernos"</li>
                        <li>"Esto del cambio climático es un cuento"</li>
                        <li>"En mi pueblo siempre supimos cuándo iba a llover"</li>
                    </ul>
                </div>

                <!-- Productos Destacados -->
                <div class="products-section">
                    <h2 style="color: #C41E3A; margin-top: 0;">👕 Nuevos Diseños Esta Semana</h2>
                    <p>¡Hemos añadido nuevas camisetas que van a revolucionar tu arsenal cuñao!</p>
                    <p><strong>🔥 Lo más nuevo:</strong></p>
                    <ul style="text-align: left; margin: 15px 0;">
                        <li>"Los jóvenes de ahora no saben trabajar" - <em>Éxito garantizado</em></li>
                        <li>"En mi época se construía para durar" - <em>Clásico atemporal</em></li>
                        <li>"Franco ordenó" - <em>Para los más atrevidos</em></li>
                    </ul>
                    
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/productos" class="cta-button">
                        🛍️ Ver Todos los Productos
                    </a>
                    
                    <p style="margin-top: 15px; font-size: 14px; color: #6c757d;">
                        <strong>Envío gratis</strong> en pedidos superiores a 50€ | <strong>Calidad premium</strong> garantizada
                    </p>
                </div>

                <!-- Estadísticas -->
                <div class="section">
                    <h2>📊 Estadísticas Cuñaos de la Semana</h2>
                    <div style="display: flex; justify-content: space-around; text-align: center; flex-wrap: wrap;">
                        <div style="margin: 10px;">
                            <div style="font-size: 24px; font-weight: bold; color: #C41E3A;">2,547</div>
                            <div style="font-size: 12px;">Cuñados satisfechos</div>
                        </div>
                        <div style="margin: 10px;">
                            <div style="font-size: 24px; font-weight: bold; color: #C41E3A;">+189%</div>
                            <div style="font-size: 12px;">Ventas este mes</div>
                        </div>
                        <div style="margin: 10px;">
                            <div style="font-size: 24px; font-weight: bold; color: #C41E3A;">97%</div>
                            <div style="font-size: 12px;">Debates ganados</div>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <p style="font-size: 16px; color: #C41E3A; font-weight: bold;">
                        "Desde que llevo estas camisetas, soy el rey de la tertulia del bar"
                    </p>
                    <p style="font-size: 14px; color: #6c757d;">
                        - Manolo, 45 años, Cliente Satisfecho de Toledo
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p style="margin: 0 0 10px 0; font-weight: bold;">
                    🇪🇸 Cuñadismo Ilustrado - Las camisetas más auténticas de España 🇪🇸
                </p>
                <p style="margin: 0 0 15px 0;">
                    Síguenos en redes sociales para más contenido cuñao diario
                </p>
                ${preferencesUrl ? `
                <p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #34495e;">
                    <a href="${preferencesUrl}" style="color: #bdc3c7; font-size: 11px;">
                        Gestionar preferencias de email
                    </a>
                </p>
                ` : ''}
            </div>
        </div>
    </body>
    </html>
  `;
};

// Función para obtener suscriptores activos
const getActiveNewsletterSubscribers = async (): Promise<NewsletterSubscriber[]> => {
  try {
    // Obtener todos los suscriptores de newsletter de la base de datos
    const newsletterSubs = await Newsletter.find({}).lean();
    console.log(`📧 Encontrados ${newsletterSubs.length} suscriptores en la base de datos`);
    
    // Convertir a formato interno
    const activeSubscribers: NewsletterSubscriber[] = newsletterSubs.map(sub => ({
      email: sub.email,
      preferences: {
        newsletterEnabled: true, // Si están en la BD, está habilitado
        marketingEnabled: true,
        productUpdates: true,
        offerAlerts: false,
        cuñaoTips: true
      }
    }));
    
    // También añadir suscriptores de memoria (para testing)
    for (const [email, subscriber] of newsletterSubscribers.entries()) {
      if (subscriber.preferences.newsletterEnabled && !activeSubscribers.find(s => s.email === email)) {
        activeSubscribers.push({ ...subscriber, email });
      }
    }
    
    return activeSubscribers;
  } catch (error) {
    console.error('Error obteniendo suscriptores de la base de datos:', error);
    
    // Fallback: usar suscriptores en memoria
    const activeSubscribers: NewsletterSubscriber[] = [];
    for (const [email, subscriber] of newsletterSubscribers.entries()) {
      if (subscriber.preferences.newsletterEnabled) {
        activeSubscribers.push({ ...subscriber, email });
      }
    }
    
    return activeSubscribers;
  }
};

// Función para obtener información del cliente si existe
const getCustomerInfo = async (email: string): Promise<Customer | null> => {
  try {
    // Buscar cliente por email en la base de datos
    const client = await Client.findOne({ email: email.toLowerCase() }).lean();
    
    if (client) {
      return {
        email: client.email,
        name: client.name,
        firstName: client.name.split(' ')[0] // Tomar el primer nombre
      };
    }
    
    // Si no está en la BD de clientes, buscar en suscriptores mock
    const mockCustomers: Record<string, Customer> = {
      'test@example.com': { email: 'test@example.com', name: 'Juan Carlos', firstName: 'Juan Carlos' },
      'cliente@gmail.com': { email: 'cliente@gmail.com', name: 'María', firstName: 'María' },
    };
    
    return mockCustomers[email] || null;
  } catch (error) {
    console.error('Error al obtener información del cliente:', error);
    return null;
  }
};

// Función principal para enviar newsletter
export const sendWeeklyNewsletter = async (): Promise<void> => {
  console.log('🚀 Iniciando envío de newsletter semanal...');
  
  try {
    // Obtener suscriptores activos
    const subscribers = await getActiveNewsletterSubscribers();
    console.log(`📧 Found ${subscribers.length} active newsletter subscribers`);
    
    if (subscribers.length === 0) {
      console.log('⚠️ No hay suscriptores activos para el newsletter');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Enviar newsletter a cada suscriptor
    for (const subscriber of subscribers) {
      try {
        // Obtener información del cliente si existe
        const customerInfo = await getCustomerInfo(subscriber.email);
        const customerName = customerInfo?.firstName || customerInfo?.name;
        
        // Generar URL de preferencias personalizada
        const preferencesUrl = await generatePreferencesUrl(subscriber.email);
        
        // Generar contenido personalizado
        const content = generateNewsletterContent(customerName, preferencesUrl);
        
        // Determinar el asunto según si es cliente o no
        const subject = customerName 
          ? `🇪🇸 ${customerName}, tu dosis semanal de cuñadismo llegó!`
          : '🇪🇸 Tu dosis semanal de cuñadismo llegó!';
        
        // Enviar email
        await sendNewsletterEmail(
          subscriber.email,
          subject,
          content
        );
        
        successCount++;
        console.log(`✅ Newsletter enviado a: ${subscriber.email}${customerName ? ` (${customerName})` : ''}`);
        
        // Pequeña pausa entre envíos para evitar límites de rate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error enviando newsletter a ${subscriber.email}:`, error);
      }
    }
    
    console.log(`📊 Newsletter enviado completamente:`);
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📧 Total procesados: ${subscribers.length}`);
    
  } catch (error) {
    console.error('❌ Error crítico en el envío de newsletter:', error);
  }
};

// Función para añadir suscriptor (para testing)
export const addNewsletterSubscriber = (email: string, preferences?: Partial<NewsletterSubscriber['preferences']>): void => {
  const defaultPreferences = {
    newsletterEnabled: true,
    marketingEnabled: true,
    productUpdates: true,
    offerAlerts: false,
    cuñaoTips: true,
  };
  
  newsletterSubscribers.set(email, {
    email,
    preferences: { ...defaultPreferences, ...preferences }
  });
  
  console.log(`📝 Suscriptor añadido: ${email}`);
};

// Función para añadir suscriptor a la base de datos (uso real)
export const addNewsletterSubscriberToDB = async (email: string): Promise<boolean> => {
  try {
    // Verificar si ya existe
    const existing = await Newsletter.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.log(`📧 Suscriptor ${email} ya existe en la base de datos`);
      return false;
    }
    
    // Crear nuevo suscriptor
    const newSubscriber = new Newsletter({
      email: email.toLowerCase()
    });
    
    await newSubscriber.save();
    console.log(`📝 Suscriptor añadido a la base de datos: ${email}`);
    return true;
  } catch (error) {
    console.error('Error añadiendo suscriptor a la base de datos:', error);
    return false;
  }
};

// Configurar cron job para ejecutar los sábados a las 18:00
// Formato: segundo minuto hora día mes día-semana
// 0 18 * * 6 = A las 18:00 todos los sábados (6 = sábado)
export const startNewsletterScheduler = (): void => {
  console.log('📅 Configurando scheduler de newsletter semanal...');
  
  // Para testing, también añadir un cron que se ejecute cada minuto
  // Eliminar en producción
  if (process.env.NODE_ENV === 'development') {
    cron.schedule('*/5 * * * *', async () => {
      console.log('🧪 [TEST] Ejecutando envío de newsletter cada 5 minutos...');
      await sendWeeklyNewsletter();
    });
    console.log('🧪 [TEST] Scheduler de testing configurado (cada 5 minutos)');
  }
  
  // Scheduler principal: sábados a las 18:00
  cron.schedule('0 18 * * 6', async () => {
    console.log('📅 [PRODUCCIÓN] Ejecutando envío semanal de newsletter...');
    await sendWeeklyNewsletter();
  }, {
    timezone: "Europe/Madrid" // Usar timezone de España
  });
  
  console.log('✅ Newsletter scheduler configurado correctamente');
  console.log('📅 Se ejecutará todos los sábados a las 18:00 (Europe/Madrid)');
};

// Función manual para testing
export const sendNewsletterManual = async (): Promise<void> => {
  console.log('🔧 Enviando newsletter manualmente...');
  await sendWeeklyNewsletter();
};
