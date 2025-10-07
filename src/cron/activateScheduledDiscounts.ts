import cron from 'node-cron';
import DiscountCode from '../models/DiscountCode.js';
import Newsletter from '../models/Newsletter.js';
import { sendEmail } from '../services/emailService.js';
import { generateNewsletterToken } from '../routes/newsletter.js';

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

async function sendDiscountEmails(discountCode: any): Promise<{ sent: number; failed: number; total: number }> {
  let emailsSent = 0;
  let emailsFailed = 0;
  let emailsToSend: string[] = [];

  try {
    // Determinar lista de emails
    if (discountCode.scheduledEmailData?.customEmails && discountCode.scheduledEmailData.customEmails.length > 0) {
      // Usar lista personalizada
      emailsToSend = discountCode.scheduledEmailData.customEmails.map((email: string) => email.trim()).filter((email: string) => email);
      console.log(`📧 Enviando cupón programado a lista personalizada de ${emailsToSend.length} emails...`);
    } else if (discountCode.scheduledEmailData?.sendToSubscribers) {
      // Obtener suscriptores con promociones activadas
      const subscribers = await Newsletter.find({
        'preferences.promotions': true
      });
      emailsToSend = subscribers.map(s => s.email);
      console.log(`📧 Enviando cupón programado a ${emailsToSend.length} suscriptores...`);
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
        console.log(`✅ Email de cupón programado enviado a: ${email}`);
        
      } catch (error) {
        emailsFailed++;
        console.error(`❌ Error enviando email de cupón programado a ${email}:`, error);
      }
    }

    console.log(`📊 Emails de cupón programado - enviados: ${emailsSent}, fallidos: ${emailsFailed}`);

  } catch (emailError) {
    console.error('Error en el proceso de envío de emails de cupón programado:', emailError);
  }

  return {
    sent: emailsSent,
    failed: emailsFailed,
    total: emailsToSend.length
  };
}

async function activateScheduledDiscounts() {
  try {
    const now = new Date();
    
    // Buscar cupones programados cuya fecha de activación ya pasó
    const scheduledCodes = await DiscountCode.find({
      scheduledActivation: { $lte: now },
      isActive: false, // Solo los que aún no están activos
      wasScheduled: { $ne: true } // No procesar los ya activados
    });

    if (scheduledCodes.length === 0) {
      return;
    }

    console.log(`⏰ Activando ${scheduledCodes.length} cupones programados...`);

    for (const code of scheduledCodes) {
      try {
        console.log(`🔓 Activando cupón programado: ${code.code}`);
        
        // Activar el cupón y marcar como programado
        // Nota: No limpiamos scheduledActivation para mantener historial
        code.isActive = true;
        code.wasScheduled = true;
        
        // Guardar sin validar scheduledActivation (ya que ahora es pasado)
        await code.save({ validateBeforeSave: false });

        console.log(`✅ Cupón ${code.code} activado exitosamente`);

        // Si tiene envío de emails programado, enviarlos
        if (code.scheduledEmailSend) {
          console.log(`📧 Iniciando envío de emails para cupón ${code.code}...`);
          const emailStats = await sendDiscountEmails(code);
          console.log(`📊 Cupón ${code.code} - Emails: ${emailStats.sent} enviados, ${emailStats.failed} fallidos de ${emailStats.total} totales`);
          
          // Marcar que se enviaron emails si al menos uno fue exitoso
          if (emailStats.sent > 0) {
            code.emailsSent = true;
            await code.save({ validateBeforeSave: false });
          }
        }

      } catch (error) {
        console.error(`❌ Error activando cupón ${code.code}:`, error);
      }
    }

    console.log(`✅ Proceso de activación de cupones programados completado`);

  } catch (error) {
    console.error('❌ Error en el proceso de activación de cupones programados:', error);
  }
}

// Ejecutar cada minuto para verificar si hay cupones a activar
// En producción, podrías ajustar esto según tus necesidades
export function startScheduledDiscountActivator() {
  console.log('🚀 Iniciando scheduler de activación de cupones programados (cada minuto)...');
  
  // Ejecutar inmediatamente al inicio para capturar cupones pendientes
  activateScheduledDiscounts();
  
  // Luego ejecutar cada minuto
  cron.schedule('* * * * *', activateScheduledDiscounts);
}
