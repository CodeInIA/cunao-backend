// src/services/emailService.ts

import nodemailer from 'nodemailer';

// 1. Configuración del "Transportador" (quién envía el correo)
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.eu', // Servidor de envío de Zoho para Europa
  port: 465,
  secure: true, // true para el puerto 465, false para otros
  auth: {
    user: process.env.ZOHO_EMAIL_USER, // Tu correo, ej: noreply@cunadismoilustrado.me
    pass: process.env.ZOHO_APP_PASSWORD, // La contraseña de aplicación que generaste
  },
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
    const info = await transporter.sendMail({
      from: `"Cuñadismo Ilustrado" <${process.env.ZOHO_EMAIL_USER}>`, // Remitente
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