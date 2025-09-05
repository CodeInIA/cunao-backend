import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { prepareNewsletterEmail } from '../routes/newsletter';

dotenv.config();

// 1. Configuración del "Transportador" (quién envía el correo)
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.eu', // Servidor de envío de Zoho para Europa
  port: 465,
  secure: true, // true para el puerto 465, false para otros
  auth: {
    user: process.env.ZOHO_EMAIL_USER, // Tu correo, ej: info@cunadismoilustrado.me
    pass: process.env.ZOHO_APP_PASSWORD, // La contraseña de aplicación que generaste
  },
  // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
  // Forzamos a Node.js a ignorar la validación de certificados
  // SOLO si no estamos en un entorno de producción.
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production' 
  }
  // --- FIN DE LA CORRECCIÓN DEFINITIVA ---
});

// Interfaz para las opciones del email
interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

// 2. Función para enviar el email
export const sendEmail = async ({ to, subject, html }: MailOptions) => {
  try {
    // Añadimos un log para verificar el entorno
    console.log(`Intentando enviar email en entorno: ${process.env.NODE_ENV || 'development'}`);
    
    const info = await transporter.sendMail({
      from: `"Cuñadismo Ilustrado" <noreply@cunadismoilustrado.me>`, // Usamos el alias noreply
      to: to, // Destinatario
      subject: subject, // Asunto
      html: html, // Cuerpo del email en HTML
    });

    console.log('Email enviado con éxito: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error al enviar el email:', error);
    throw new Error('El email no pudo ser enviado.');
  }
};

// Función para generar URL de gestión de preferencias
export const generatePreferencesUrl = async (email: string): Promise<string> => {
  const token = await prepareNewsletterEmail(email);
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/newsletter/preferences?token=${encodeURIComponent(token)}`;
};

// Función para enviar newsletter con enlace de gestión
export const sendNewsletterEmail = async (to: string, subject: string, content: string) => {
  // Verificar si el contenido ya incluye un enlace de preferencias
  const hasPreferencesLink = content.includes('/newsletter/preferences?token=');
  
  let htmlWithFooter;
  
  if (hasPreferencesLink) {
    // Si ya tiene el enlace, usar el contenido tal como está
    htmlWithFooter = content;
  } else {
    // Si no tiene enlace, generar uno nuevo
    const preferencesUrl = await generatePreferencesUrl(to);
    
    htmlWithFooter = `
      ${content}
      
      <div style="margin-top: 40px; padding: 20px; background-color: #f8f9fa; border-top: 1px solid #dee2e6;">
        <p style="margin: 0; font-size: 12px; color: #6c757d; text-align: center;">
          ¿No quieres recibir más emails? 
          <a href="${preferencesUrl}" style="color: #007bff; text-decoration: none;">
            Gestiona tus preferencias aquí
          </a>
        </p>
        <p style="margin: 10px 0 0 0; font-size: 10px; color: #6c757d; text-align: center;">
          Cuñadismo Ilustrado - Las camisetas más auténticas de España
        </p>
      </div>
    `;
  }

  return sendEmail({
    to,
    subject,
    html: htmlWithFooter
  });
};

// Función para enviar email de marketing con enlace de gestión
export const sendMarketingEmail = async (to: string, subject: string, content: string) => {
  const preferencesUrl = await generatePreferencesUrl(to);
  
  const htmlWithFooter = `
    ${content}
    
    <div style="margin-top: 40px; padding: 20px; background-color: #f8f9fa; border-top: 1px solid #dee2e6;">
      <p style="margin: 0; font-size: 12px; color: #6c757d; text-align: center;">
        Has recibido este email porque estás suscrito a nuestras ofertas. 
        <a href="${preferencesUrl}" style="color: #007bff; text-decoration: none;">
          Gestiona tus preferencias o date de baja aquí
        </a>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 10px; color: #6c757d; text-align: center;">
        Cuñadismo Ilustrado - Las camisetas más auténticas de España
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html: htmlWithFooter
  });
};