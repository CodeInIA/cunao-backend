import dotenv from 'dotenv';

import nodemailer from 'nodemailer';

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