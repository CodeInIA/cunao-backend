import Newsletter, { INewsletter } from '../models/Newsletter.js';
import { sendEmail } from '../services/emailService.js';
import { generateNewsletterToken } from '../routes/newsletter.js';

interface NewsletterPreferences {
  newsletter: boolean;
  promotions: boolean;
  newProducts: boolean;
}

interface NewsletterSubscriber {
  email: string;
  preferences: NewsletterPreferences;
}

interface Customer {
  name?: string;
  email: string;
  customerId?: string;
}

// Función principal para obtener suscriptores (placeholders)
const newsletterSubscribers = new Map<string, NewsletterSubscriber>();

// Contenido base de la newsletter semanal - VERSIÓN SIMPLE
const generateNewsletterContent = (customerName?: string, preferencesUrl?: string) => {
  const greeting = customerName ? `¡Hola ${customerName}!` : '¡Hola cuñao!';
  
  // Array de 52 frases cuñao para cada semana del año
  const weeklyPhrases = [
    "El verdadero cuñao no necesita muchas palabras... pero siempre tiene la camiseta perfecta para expresarse",
    "¿Sabes cuál es la diferencia entre un cuñao y un experto? La camiseta que lleva puesta",
    "En España, una opinión sin camiseta cuñao es como un jamón sin pata negra: le falta autenticidad",
    "El cuñadismo no es solo una actitud, es un arte que se lleva con orgullo y estilo",
    "Dicen que la ropa no hace al monje... pero una buena camiseta cuñao sí hace al auténtico español",
    "¿Qué tienen en común Cervantes, Picasso y tú? Todos necesitan la camiseta perfecta para expresar su genio",
    "El secreto del cuñao auténtico: 10% sabiduría popular, 90% camiseta con personalidad",
    "Una camiseta cuñao vale más que mil palabras... y además queda mejor en las fotos",
    "El español auténtico se reconoce a tres metros de distancia: por la camiseta que lleva",
    "No es que sea un sabelotodo, es que tengo la camiseta adecuada para cada ocasión",
    "La diferencia entre dar consejos y ser cuñao está en llevar la camiseta correcta",
    "En España tenemos flamenco, paella y camisetas cuñao: las tres joyas de nuestra cultura",
    "¿Para qué estudiar cuando puedes llevar una camiseta que ya lo dice todo?",
    "El cuñao evolucionado no solo opina de todo, también viste para la ocasión",
    "Una buena camiseta cuñao es como el aceite de oliva: mejora cualquier situación",
    "No es ser pesado, es tener la camiseta perfecta para cada conversación de bar",
    "El auténtico español no necesita presentación: su camiseta habla por él",
    "¿Sabes por qué los cuñaos siempre tienen razón? Por la camiseta que llevan puesta",
    "En España, el conocimiento se transmite de cuñao a cuñao... y de camiseta a camiseta",
    "Una camiseta cuñao es como un buen vino: mejora con el tiempo y las conversaciones",
    "El español que no tiene opinión de todo es porque no ha encontrado su camiseta ideal",
    "¿Para qué Google si tienes un cuñao con la camiseta adecuada?",
    "La sabiduría popular española viene en formato camiseta desde 1976",
    "No es que sea un experto en todo, es que mi camiseta me da credibilidad instantánea",
    "El cuñadismo es un arte milenario que se perfecciona con la camiseta correcta",
    "Una conversación sin cuñao es como una paella sin arroz: le falta lo esencial",
    "El español auténtico colecciona camisetas como otros coleccionan sellos",
    "¿Sabes cuál es el superpoder del cuñao? Su increíble capacidad para elegir camisetas",
    "En España, las camisetas cuñao son patrimonio cultural inmaterial",
    "No es que sepa de todo, es que tengo una camiseta para cada tema de conversación",
    "El cuñao de calidad se distingue por dos cosas: sus opiniones y sus camisetas",
    "Una buena camiseta cuñao es la mejor inversión que puede hacer un español auténtico",
    "¿Para qué un máster cuando puedes tener una camiseta que lo diga todo?",
    "El español que no opina de fútbol es porque no ha encontrado la camiseta adecuada",
    "En España, la elegancia se mide en cuñadismos por camiseta",
    "No es ser un sabelotodo, es tener el guardarropa cuñao más completo del barrio",
    "El auténtico cuñao español es reconocido internacionalmente por su estilo único",
    "Una camiseta cuñao bien elegida vale más que una carrera universitaria",
    "¿Sabes por qué España es única en el mundo? Por nuestras camisetas cuñao",
    "El español auténtico no necesita curriculum: tiene camisetas que hablan por él",
    "Una conversación de bar sin cuñao es como un gazpacho sin tomate",
    "El cuñadismo español se exporta mejor en formato camiseta",
    "No es que sea un genio, es que mi colección de camisetas me da superpoderes",
    "En España, las mejores ideas nacen entre cuñaos con buenas camisetas",
    "El español que no tiene opinión política es porque no ha estrenado su camiseta nueva",
    "Una camiseta cuñao es el mejor pasaporte para cualquier conversación española",
    "¿Para qué Wikipedia si tienes un cuñao con la camiseta perfecta para cada tema?",
    "El auténtico español se reconoce por su capacidad innata para elegir camisetas",
    "No es ser pesado, es tener una camiseta tan buena que no puedes evitar opinar",
    "En España, el buen gusto en camisetas es un talento que se hereda de generación en generación",
    "El cuñao evolucionado combina sabiduría ancestral con el mejor estilo en camisetas",
    "Una buena camiseta cuñao es como el jamón ibérico: auténtica, sabrosa y 100% española"
  ];
  
  // Calcular la semana del año (1-52)
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const daysSinceStartOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekOfYear = Math.floor(daysSinceStartOfYear / 7) % 52;
  
  // Seleccionar frase basada en la semana del año
  const selectedPhrase = weeklyPhrases[weekOfYear];
  
  console.log(`📅 Semana ${weekOfYear + 1} del año - Frase seleccionada: "${selectedPhrase.substring(0, 50)}..."`);
  
  // Configuración del frontend
  const config = {
    frontend: {
      url: 'https://cunadismoilustrado.me'
    }
  };
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Newsletter Semanal - Cuñadismo Ilustrado</title>
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
                width: 100px;
                height: 100px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .logo img {
                width: 100px;
                height: 100px;
                object-fit: contain;
            }
            .brand-name {
                color: #F1BF00;
                font-size: 28px;
                font-weight: bold;
                margin: 0;
                letter-spacing: 1px;
            }
            .subtitle {
                color: #94a3b8;
                font-size: 14px;
                font-weight: normal;
                margin: 8px 0 0 0;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            .content {
                padding: 30px;
                text-align: center;
                background-color: #1e293b;
            }
            .weekly-phrase {
                background: linear-gradient(135deg, #F1BF00, #D1A000);
                color: #1e293b;
                padding: 25px;
                border-radius: 12px;
                margin: 20px 0 30px 0;
                font-size: 18px;
                font-weight: 600;
                font-style: italic;
                box-shadow: 0 4px 16px rgba(241, 191, 0, 0.3);
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
                margin: 20px 0;
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
                .weekly-phrase { font-size: 16px; padding: 20px; }
                .cta-button { padding: 14px 28px; font-size: 15px; }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <div class="logo">
                    <img src="https://cunadismoilustrado.me/logo-sin-letras.png" alt="Cuñadismo Ilustrado" style="width: 120px; height: 120px; object-fit: contain;" />
                </div>
                <h1 class="brand-name">CUÑADISMO ILUSTRADO</h1>
                <p class="subtitle">Frase Cuñao de la Semana</p>
            </div>

            <!-- Content -->
            <div class="content">
                <div class="weekly-phrase">
                    "${selectedPhrase}"
                </div>
                
                <p style="color: #94a3b8; margin-bottom: 15px; font-size: 16px; line-height: 1.6; text-align: center;">
                    ${greeting} 👋
                </p>
                
                <p style="color: #94a3b8; margin-bottom: 15px; font-size: 16px; line-height: 1.6; text-align: center;">
                    Esta semana venimos con energía renovada y las camisetas más auténticas de España.
                </p>
                
                <p style="color: #94a3b8; margin-bottom: 25px; font-size: 16px; line-height: 1.6; text-align: center;">
                    Porque ser cuñao no es solo saber de todo... ¡es llevarlo con estilo!
                </p>
                
                <a href="${config.frontend.url}/productos" class="cta-button" style="color: #1e293b !important;">
                    🛒 Descubre Tu Camiseta Cuñao
                </a>
                
                <p style="color: #64748b; margin-top: 20px; font-size: 14px; font-style: italic;">
                    "Desde Asturias hasta Andalucía, somos la marca que entiende el alma española" 🇪🇸
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

// Función para obtener suscriptores activos
const getActiveNewsletterSubscribers = async (): Promise<NewsletterSubscriber[]> => {
  try {
    // Obtener solo los suscriptores que tienen newsletter activado
    const newsletterSubs = await Newsletter.find({
      'preferences.newsletter': true
    }).lean();
    
    console.log(`📧 Encontrados ${newsletterSubs.length} suscriptores con newsletter activado`);
    
    // Convertir a formato interno
    const activeSubscribers: NewsletterSubscriber[] = newsletterSubs.map(sub => ({
      email: sub.email,
      preferences: {
        newsletter: sub.preferences?.newsletter || true,
        promotions: sub.preferences?.promotions || false,
        newProducts: sub.preferences?.newProducts || false
      }
    }));

    // Filtrar solo los que quieren recibir newsletter (doble verificación)
    const filteredSubscribers = activeSubscribers.filter(sub => sub.preferences.newsletter);
    console.log(`📧 ${filteredSubscribers.length} suscriptores finales para envío de newsletter`);
    
    return filteredSubscribers;
  } catch (error) {
    console.error('❌ Error obteniendo suscriptores de newsletter:', error);
    return [];
  }
};

// Función para obtener información del cliente
const getCustomerInfo = async (email: string): Promise<Customer | null> => {
  try {
    // Aquí buscarías en tu base de datos de customers/orders
    // Por ahora retornamos null ya que no tenemos esa implementación
    return null;
  } catch (error) {
    console.error(`❌ Error obteniendo info del cliente ${email}:`, error);
    return null;
  }
};

// Función principal para enviar newsletter semanal
export const sendWeeklyNewsletter = async (): Promise<void> => {
  try {
    console.log('📧 Iniciando envío de newsletter semanal...');
    
    const subscribers = await getActiveNewsletterSubscribers();
    
    if (subscribers.length === 0) {
      console.log('📧 No hay suscriptores activos para newsletter');
      return;
    }

    console.log(`📧 Enviando newsletter a ${subscribers.length} suscriptores...`);
    
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const subscriber of subscribers) {
      try {
        // Obtener información del cliente si existe
        const customerInfo = await getCustomerInfo(subscriber.email);
        
        // Generar token de autenticación para preferencias
        const token = generateNewsletterToken(subscriber.email);
        
        // Actualizar token en la base de datos y verificar que se guardó
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
        
        console.log(`✅ Token generado y guardado para ${subscriber.email}: ${token.substring(0, 10)}...`);
        
        // Generar URL de preferencias con el token verificado
        const preferencesUrl = `https://cunadismoilustrado.me/newsletter/preferences?token=${token}`;
        
        // Generar contenido del email
        const emailContent = generateNewsletterContent(customerInfo?.name, preferencesUrl);
        
        // Enviar email
        await sendEmail({
          to: subscriber.email,
          subject: '🇪🇸 Newsletter Semanal - Cuñadismo Ilustrado',
          html: emailContent
        });
        
        emailsSent++;
        console.log(`✅ Newsletter enviado a: ${subscriber.email}`);
        
        // Pequeña pausa para no sobrecargar el servicio de email
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        emailsFailed++;
        console.error(`❌ Error enviando newsletter a ${subscriber.email}:`, error);
      }
    }
    
    console.log(`📧 Newsletter semanal completado: ${emailsSent} enviados, ${emailsFailed} fallidos`);
    
  } catch (error) {
    console.error('❌ Error en envío de newsletter semanal:', error);
  }
};

// Función para agregar suscriptor (mantener compatibilidad)
export const addNewsletterSubscriberToDB = async (email: string): Promise<boolean> => {
  try {
    // Verificar si ya existe
    const existingSubscriber = await Newsletter.findOne({ email });
    if (existingSubscriber) {
      console.log(`📧 El email ${email} ya está suscrito`);
      return true;
    }

    // Crear nuevo suscriptor
    const newSubscriber = new Newsletter({
      email,
      preferences: {
        newsletter: true,
        promotions: false,
        newProducts: false
      }
    });

    await newSubscriber.save();
    console.log(`✅ Nuevo suscriptor agregado: ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error agregando suscriptor ${email}:`, error);
    return false;
  }
};

// Función para envío manual de newsletter
export const sendNewsletterManual = async (): Promise<void> => {
  console.log('📧 Enviando newsletter manual...');
  await sendWeeklyNewsletter();
};

// Scheduler para envío automático de newsletter
export const startNewsletterScheduler = (): void => {
  console.log('🕒 Iniciando scheduler de newsletter semanal...');
  
  // En desarrollo: enviar cada 1 minuto para testing
  // En producción: enviar cada sábado a las 18:00
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    // Cada 15 minutos en desarrollo
    setInterval(async () => {
      console.log('📧 [DEV] Enviando newsletter de prueba...');
      await sendWeeklyNewsletter();
    }, 15 * 60 * 1000); // 15 minutos

    console.log('🕒 Newsletter scheduler configurado para desarrollo (cada 15 minutos)');
  } else {
    // Cada sábado a las 18:00 en producción
    setInterval(async () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 6 = sábado
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      // Solo enviar los sábados a las 18:00
      if (dayOfWeek === 6 && hour === 18 && minute < 5) {
        console.log('📧 [PROD] Enviando newsletter semanal (sábado 18:00)...');
        await sendWeeklyNewsletter();
      }
    }, 5 * 60 * 1000); // Revisar cada 5 minutos
    
    console.log('🕒 Newsletter scheduler configurado para producción (sábados 18:00)');
  }
};
