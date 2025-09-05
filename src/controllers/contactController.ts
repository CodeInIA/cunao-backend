import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendEmail } from '../services/emailService.js';
import { ApiResponse } from '../types/index.js';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Función para extraer el dominio del FRONTEND_URL
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    // Si estamos en desarrollo (localhost), usar el dominio de producción
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'cunadismoilustrado.me';
    }
    
    return hostname;
  } catch {
    return 'cunadismoilustrado.me'; // fallback
  }
}

export const sendContactForm = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, subject, message }: ContactFormData = req.body;

  // Validación de campos requeridos
  if (!name || !email || !subject || !message) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Todos los campos son obligatorios'
    };
    return res.status(400).json(response);
  }

  // Validación básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Email no válido'
    };
    return res.status(400).json(response);
  }

  try {
    // Obtener el dominio para el email de destino
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://www.cunadismoilustrado.me'
      : 'https://www.cunadismoilustrado.me';
    
    const domain = getDomainFromUrl(frontendUrl);
    const destinationEmail = `info@${domain}`;

    // HTML del email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
        <div style="background-color: #dc2626; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🇪🇸 Nuevo Mensaje de Contacto</h1>
          <p style="color: #fbbf24; margin: 10px 0 0 0; font-style: italic;">"¡Tienes un mensaje, cuñao!"</p>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="margin-bottom: 20px;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 18px;">📋 Detalles del Contacto</h3>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">
              <p style="margin: 5px 0;"><strong>👤 Nombre:</strong> ${name}</p>
              <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>📝 Asunto:</strong> ${subject}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 18px;">💬 Mensaje</h3>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <p style="margin: 0; line-height: 1.6; color: #334155; white-space: pre-wrap;">${message}</p>
            </div>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #fbbf24; margin-top: 20px;">
            <p style="margin: 0; color: #92400e; font-style: italic;">
              📅 Recibido el: ${new Date().toLocaleString('es-ES', { 
                timeZone: 'Europe/Madrid',
                dateStyle: 'full',
                timeStyle: 'short'
              })}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
              💡 <em>Responde a este email directamente a: ${email}</em>
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
          <p style="margin: 0;">
            Este mensaje fue enviado desde el formulario de contacto de Cuñadismo Ilustrado
          </p>
          <p style="margin: 5px 0 0 0; font-style: italic;">
            "El mejor servicio de atención al cliente de todo el pueblo"
          </p>
        </div>
      </div>
    `;

    // Enviar el email a nosotros
    await sendEmail({
      to: destinationEmail,
      subject: `[Contacto Web] ${subject}`,
      html: emailHtml
    });

    console.log(`Email de contacto enviado de ${email} a ${destinationEmail}`);

    // Email de confirmación para el cliente
    const confirmationEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
        <!-- Logo Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${frontendUrl}/logo-sin-letras.png" 
               alt="Cuñadismo Ilustrado" 
               style="width: 80px; height: 80px; border-radius: 50%; 
                      box-shadow: 0 4px 8px rgba(220, 38, 38, 0.2);
                      border: 3px solid #dc2626;" />
        </div>
        
        <div style="background-color: #dc2626; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🇪🇸 ¡Hemos recibido tu mensaje!</h1>
          <p style="color: #fbbf24; margin: 10px 0 0 0; font-style: italic;">"Gracias por contactarnos, cuñao"</p>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 20px;">✅ Mensaje Recibido Correctamente</h2>
            <p style="color: #334155; margin: 0; line-height: 1.6;">
              Hola <strong>${name}</strong>, hemos recibido tu mensaje y queremos confirmarte que nos pondremos en contacto contigo lo más rápido posible.
            </p>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 16px;">📋 Resumen de tu consulta:</h3>
            <p style="margin: 5px 0;"><strong>Asunto:</strong> ${subject}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES', { 
              timeZone: 'Europe/Madrid',
              dateStyle: 'full',
              timeStyle: 'short'
            })}</p>
          </div>
          
          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; border-left: 4px solid #10b981; margin: 20px 0;">
            <h3 style="color: #059669; margin: 0 0 10px 0; font-size: 16px;">⏰ ¿Cuándo recibirás respuesta?</h3>
            <p style="margin: 0; color: #065f46; line-height: 1.6;">
              Nuestro equipo revisa todos los mensajes de forma prioritaria. Normalmente respondemos en menos de <strong>24 horas</strong> durante días laborables.
            </p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #fbbf24; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-style: italic; text-align: center;">
              💡 <strong>Tip cuñao:</strong> Si necesitas ayuda urgente, también puedes escribirnos directamente a ${destinationEmail}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">
              Mientras tanto, puedes seguir navegando por nuestra tienda de productos cuñao 👕
            </p>
            <a href="${frontendUrl}" 
               style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;
                      transition: background-color 0.2s ease;">
              🛒 Ver Productos Cuñao
            </a>
            <p style="margin: 15px 0 0 0; color: #64748b; font-size: 12px; font-style: italic;">
              "Las mejores camisetas con las frases más cuñao de España"
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
          <p style="margin: 0;">
            Gracias por confiar en Cuñadismo Ilustrado
          </p>
          <p style="margin: 5px 0 0 0; font-style: italic;">
            "En mi pueblo respondemos los emails más rápido que nadie"
          </p>
        </div>
      </div>
    `;

    // Enviar email de confirmación al cliente
    await sendEmail({
      to: email,
      subject: '✅ Hemos recibido tu mensaje - Cuñadismo Ilustrado',
      html: confirmationEmailHtml
    });

    console.log(`Email de confirmación enviado a ${email}`);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Mensaje enviado correctamente' },
      message: 'Tu mensaje ha sido enviado. Te responderemos pronto.'
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error enviando email de contacto:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.'
    };
    
    res.status(500).json(response);
  }
});
