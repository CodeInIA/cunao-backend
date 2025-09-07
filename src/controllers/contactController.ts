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

  // Validaciones más estrictas
  
  // Validar nombre (solo letras, espacios y algunos caracteres especiales)
  const nameRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]{2,50}$/;
  if (!nameRegex.test(name.trim())) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'El nombre debe contener solo letras y tener entre 2 y 50 caracteres'
    };
    return res.status(400).json(response);
  }

  // Validación más robusta de email con dominios reales
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email.trim()) || email.length > 100) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Por favor, introduce un email válido'
    };
    return res.status(400).json(response);
  }

  // Validar que el dominio del email sea real (no dominios temporales o falsos)
  const emailDomain = email.trim().toLowerCase().split('@')[1];
  const blockedDomains = [
    // Dominios temporales/desechables comunes
    '10minutemail.com', '10minutemail.net', 'tempmail.org', 'guerrillamail.com',
    'mailinator.com', 'maildrop.cc', 'yopmail.com', 'temp-mail.org',
    'throwaway.email', 'getnada.com', 'mohmal.com', 'sharklasers.com',
    'trashmail.com', 'armyspy.com', 'cuvox.de', 'dayrep.com', 'einrot.com',
    'fleckens.hu', 'gustr.com', 'jourrapide.com', 'mailcat.biz', 'superrito.com',
    'teleworm.us', 'rhyta.com', 'emltmp.com', 'tempr.email', 'dropmail.me',
    // Dominios falsos obvios
    'example.com', 'test.com', 'fake.com', 'invalid.com', 'localhost.com',
    'noexiste.com', 'falso.com', 'prueba.com', 'testing.com'
  ];

  // Verificar extensiones de dominio válidas
  const validTlds = [
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'es', 'eu', 'uk', 'de', 'fr', 'it',
    'pt', 'br', 'ar', 'mx', 'co', 'info', 'biz', 'name', 'pro', 'cat', 'tel',
    'travel', 'jobs', 'mobi', 'asia', 'post', 'xxx', 'aero', 'coop', 'museum',
    'int', 'arpa', 'io', 'ai', 'app', 'dev', 'tech', 'online', 'site', 'store',
    'blog', 'news', 'media', 'email', 'cloud', 'digital', 'global', 'world'
  ];

  const domainParts = emailDomain.split('.');
  const tld = domainParts[domainParts.length - 1];

  if (blockedDomains.includes(emailDomain)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'No se permiten emails temporales o desechables. Usa tu email personal.'
    };
    return res.status(400).json(response);
  }

  if (!validTlds.includes(tld) || domainParts.length < 2) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Por favor, introduce un email con un dominio válido'
    };
    return res.status(400).json(response);
  }

  // Verificar que el dominio tenga al menos 3 caracteres antes del TLD
  if (domainParts[domainParts.length - 2].length < 2) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'El dominio del email debe ser válido'
    };
    return res.status(400).json(response);
  }

  // Validar asunto
  if (subject.trim().length < 5 || subject.trim().length > 100) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'El asunto debe tener entre 5 y 100 caracteres'
    };
    return res.status(400).json(response);
  }

  // Validar mensaje
  if (message.trim().length < 10 || message.trim().length > 1000) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'El mensaje debe tener entre 10 y 1000 caracteres'
    };
    return res.status(400).json(response);
  }

  // Detectar posible spam (múltiples enlaces)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = message.match(urlRegex) || [];
  if (urls.length > 2) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'El mensaje no puede contener más de 2 enlaces'
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

    // HTML del email (para nosotros)
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; padding: 0; border-radius: 12px; overflow: hidden; color: #e2e8f0;">
        <!-- Header con gradiente -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px 20px; text-align: center; position: relative; border-bottom: 3px solid #fbbf24;">
          <div style="padding: 0; border-radius: 50%; width: 84px; height: 84px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; border: 3px solid #fbbf24;">
            <img src="${frontendUrl}/logo-sin-letras.webp" alt="Cuñadismo Ilustrado" style="width: 76px; height: 76px; border-radius: 50%; display: block; background: #0f172a; border: 2px solid #fbbf24; object-fit: cover;" />
          </div>
          <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: bold;">Nuevo Mensaje de Contacto</h1>
          <p style="color: #cbd5e1; margin: 15px 0 0 0; font-style: italic; font-size: 16px;">"¡Tienes un mensaje, cuñao!"</p>
        </div>
        
        <!-- Contenido principal -->
        <div style="background: #1e293b; padding: 40px 30px; margin: 0;">
          <!-- Detalles del contacto -->
          <div style="background: #334155; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #fbbf24;">
            <h3 style="color: #fbbf24; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center; gap: 10px;">
              📋 <span>Detalles del Contacto</span>
            </h3>
            <div style="background: #475569; padding: 20px; border-radius: 8px; border: 1px solid #64748b;">
              <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #64748b;">
                <strong style="color: #fbbf24; font-weight: 600;">👤 Nombre:</strong> 
                <span style="color: #e2e8f0; margin-left: 10px;">${name}</span>
              </div>
              <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #64748b;">
                <strong style="color: #fbbf24; font-weight: 600;">📧 Email:</strong> 
                <a href="mailto:${email}" style="color: #fbbf24; margin-left: 10px; text-decoration: underline;">${email}</a>
              </div>
              <div style="padding: 8px 0;">
                <strong style="color: #fbbf24; font-weight: 600;">📝 Asunto:</strong> 
                <span style="color: #e2e8f0; margin-left: 10px;">${subject}</span>
              </div>
            </div>
          </div>
          
          <!-- Mensaje -->
          <div style="background: #334155; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #0ea5e9;">
            <h3 style="color: #0ea5e9; margin: 0 0 15px 0; font-size: 20px; display: flex; align-items: center; gap: 10px;">
              💬 <span>Mensaje</span>
            </h3>
            <div style="background: #475569; padding: 25px; border-radius: 8px; border: 2px solid #64748b;">
              <p style="margin: 0; line-height: 1.8; color: #f1f5f9; white-space: pre-wrap; font-size: 15px;">${message}</p>
            </div>
          </div>
          
          <!-- Info adicional -->
          <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 20px; border-radius: 12px; border: 2px solid #fbbf24; margin-top: 25px;">
            <p style="margin: 0; color: #111827; font-weight: 700; text-align: center;">
              📅 <strong>Recibido el:</strong> ${new Date().toLocaleString('es-ES', { 
                timeZone: 'Europe/Madrid',
                dateStyle: 'full',
                timeStyle: 'short'
              })}
            </p>
          </div>
          
          <!-- Call to action -->
          <div style="text-align: center; margin-top: 30px; padding: 25px; background: #334155; border-radius: 12px;">
            <p style="margin: 0 0 15px 0; color: #cbd5e1; font-size: 16px;">
              💡 <strong style="color: #fbbf24;">Responder directamente a:</strong> 
              <a href="mailto:${email}" style="color: #fbbf24; text-decoration: underline;">${email}</a>
            </p>
            <a href="mailto:${email}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #111827; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 16px;">
              ✉️ Responder Email
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #0f172a; text-align: center; padding: 25px 20px; color: #94a3b8; border-top: 2px solid #334155;">
          <p style="margin: 0 0 5px 0; font-size: 14px;">
            Este mensaje fue enviado desde el formulario de contacto de <strong style="color: #fbbf24;">Cuñadismo Ilustrado</strong>
          </p>
          <p style="margin: 0; font-style: italic; font-size: 13px; color: #64748b;">
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
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; padding: 0; border-radius: 12px; overflow: hidden; color: #e2e8f0;">
        <!-- Logo Header -->
        <div style="text-align: center; padding: 20px 20px 10px 20px; background: #1e293b;">
          <img src="${frontendUrl}/logo-sin-letras.webp" 
               alt="Cuñadismo Ilustrado" 
               style="width: 80px; height: 80px; border-radius: 50%; 
                      box-shadow: 0 6px 16px rgba(251, 191, 36, 0.4);
                      border: 4px solid #fbbf24;" />
        </div>
        
        <!-- Header principal -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 20px 20px 30px 20px; text-align: center; border-bottom: 3px solid #fbbf24;">
          <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">¡Hemos recibido tu mensaje!</h1>
          <p style="color: #cbd5e1; margin: 15px 0 0 0; font-style: italic; font-size: 16px;">"Gracias por contactarnos, cuñao"</p>
        </div>
        
        <!-- Contenido principal -->
        <div style="background: #1e293b; padding: 40px 30px;">
          <!-- Confirmación -->
          <div style="text-align: center; margin-bottom: 30px; background: #334155; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); border-top: 5px solid #fbbf24;">
            <h2 style="color: #fbbf24; margin: 0 0 15px 0; font-size: 22px; font-weight: bold; text-align: center;">
              <span style="display: inline-block; vertical-align: middle;">✅</span>
              <span style="display: inline-block; vertical-align: middle; margin-left: 12px;">Mensaje Recibido Correctamente</span>
            </h2>
            <p style="color: #cbd5e1; margin: 0; line-height: 1.7; font-size: 16px;">
              Hola <strong style="color: #fbbf24;">${name}</strong>, hemos recibido tu mensaje y queremos confirmarte que nos pondremos en contacto contigo lo más rápido posible.
            </p>
          </div>
          
          <!-- Resumen de la consulta -->
          <div style="background: #334155; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); margin: 25px 0; border-left: 5px solid #0ea5e9;">
            <h3 style="color: #0ea5e9; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
              📋 <span>Resumen de tu consulta</span>
            </h3>
            <div style="background: #475569; padding: 20px; border-radius: 8px; border: 1px solid #64748b;">
              <p style="margin: 0 0 10px 0; color: #e2e8f0;"><strong style="color: #fbbf24;">Asunto:</strong> ${subject}</p>
              <p style="margin: 0; color: #e2e8f0;"><strong style="color: #fbbf24;">Fecha:</strong> ${new Date().toLocaleString('es-ES', { 
                timeZone: 'Europe/Madrid',
                dateStyle: 'full',
                timeStyle: 'short'
              })}</p>
            </div>
          </div>
          
          <!-- Tiempo de respuesta -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; border-radius: 12px; border: 2px solid #10b981; margin: 25px 0; color: white;">
            <h3 style="color: white; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
              ⏰ <span>¿Cuándo recibirás respuesta?</span>
            </h3>
            <p style="margin: 0; color: #d1fae5; line-height: 1.7; font-size: 15px;">
              Nuestro equipo revisa todos los mensajes de forma prioritaria. Normalmente respondemos en menos de <strong style="color: white;">24 horas</strong> durante días laborables.
            </p>
          </div>
          
          <!-- Tip cuñao -->
          <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 20px; border-radius: 12px; border: 2px solid #fbbf24; margin: 25px 0; color: #92400e;">
            <p style="margin: 0; color: #92400e; font-style: italic; text-align: center; font-size: 15px;">
              💡 <strong>Tip cuñao:</strong> Si necesitas ayuda urgente, también puedes escribirnos directamente a <strong>${destinationEmail}</strong>
            </p>
          </div>
          
          <!-- Call to action para la tienda -->
          <div style="text-align: center; margin-top: 30px; padding: 30px; background: #334155; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); border-top: 5px solid #fbbf24;">
            <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
              Mientras tanto, puedes seguir navegando por nuestra tienda de productos cuñao 👕
            </p>
            <a href="${frontendUrl}/productos" 
               style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #92400e; padding: 15px 30px; 
                      text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 18px;
                      box-shadow: 0 6px 16px rgba(251, 191, 36, 0.3); transition: all 0.3s ease;">
              🛒 Ver Productos Cuñao
            </a>
            <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 14px; font-style: italic;">
              "Las mejores camisetas con las frases más cuñao de España"
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #0f172a; text-align: center; padding: 25px 20px; color: #94a3b8; border-top: 2px solid #334155;">
          <p style="margin: 0 0 10px 0; font-size: 15px;">
            Gracias por confiar en <strong style="color: #fbbf24;">Cuñadismo Ilustrado</strong>
          </p>
          <p style="margin: 0; font-style: italic; font-size: 14px; color: #64748b;">
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
