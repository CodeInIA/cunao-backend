#!/usr/bin/env node

console.log('🔥 Script iniciado - cargando módulos...');

import * as readline from 'readline';
import * as mongoose from 'mongoose';
import DiscountCode from '../models/DiscountCode.js';
import Newsletter from '../models/Newsletter.js';
import { sendEmail } from '../services/emailService.js';
import { generateNewsletterToken } from '../routes/newsletter.js';
import * as dotenv from 'dotenv';

console.log('📦 Módulos cargados correctamente');

// Cargar variables de entorno
dotenv.config();

// Configurar readline para entrada interactiva
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Manejar señales de interrupción para cerrar correctamente
const cleanup = async () => {
  console.log('\n🛑 Operación cancelada por el usuario');
  rl.close();
  await mongoose.disconnect();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Función para hacer preguntas
const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

// Función para generar el HTML del email de descuento
const generateDiscountEmailHTML = (
  discountPercentage: number,
  code: string,
  expiryText: string,
  customerName: string = '',
  preferencesUrl: string = ''
) => {
  const greeting = customerName ? `¡Hola ${customerName}!` : '¡Hola cuñao!';
  // Siempre usar la URL de producción para los emails
  const frontendUrl = process.env.FRONTEND_PRODUCTION_URL || 'https://www.cunadismoilustrado.me';

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
        
        .btn-secondary {
            background: transparent;
            color: #fbbf24;
            border: 2px solid #fbbf24;
        }
        
        .btn-secondary:hover {
            background: #fbbf24;
            color: #1e293b;
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
                ¡Tenemos algo especial para ti! Disfruta de un 
                <span class="discount-highlight">${discountPercentage}% de descuento</span>
                en toda nuestra colección de camisetas cuñao.
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
};

// Función principal del script
async function createDiscountCode() {
  console.log('🚀 Iniciando script de creación de códigos de descuento...');
  
  try {
    console.log('\n🎯 === CREADOR DE CÓDIGOS DE DESCUENTO === 🎯\n');
    
    // Conectar a MongoDB
    console.log('🔌 Intentando conectar a MongoDB...');
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI no está configurado en las variables de entorno');
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');
    
    // 1. Pedir tipo de descuento (subtotal o envio)
    let appliesTo: 'subtotal' | 'shipping';
    while (true) {
      const typeInput = await question('🔖 ¿El descuento aplica al (1) subtotal de productos o (2) envío? Escribe 1 o 2: ');
      if (typeInput.trim() === '1') {
        appliesTo = 'subtotal';
        break;
      } else if (typeInput.trim() === '2') {
        appliesTo = 'shipping';
        break;
      } else {
        console.log('❌ Respuesta no válida. Escribe 1 para subtotal o 2 para envío.\n');
      }
    }

    // 2. Pedir porcentaje de descuento
    let discountPercentage: number;
    while (true) {
      const percentageInput = await question('💰 ¿Qué porcentaje de descuento quieres ofrecer? (1-100): ');
      discountPercentage = parseInt(percentageInput);
      
      if (isNaN(discountPercentage) || discountPercentage < 1 || discountPercentage > 100) {
        console.log('❌ Por favor, introduce un número entre 1 y 100\n');
        continue;
      }
      break;
    }

    // 3. Pedir código de descuento
    let code: string;
    while (true) {
      const codeInput = await question('🏷️  ¿Qué código quieres usar para este descuento? (ej: CUNADISMO): ');
      code = codeInput.trim().toUpperCase();
      
      if (!/^[A-ZÁÉÍÓÚÑ0-9_-]{3,20}$/.test(code)) {
        console.log('❌ El código debe tener entre 3 y 20 caracteres y solo puede contener letras (incluida Ñ), números, guiones y guiones bajos\n');
        continue;
      }
      
      // Verificar si el código ya existe
      const existingCode = await DiscountCode.findOne({ code });
      if (existingCode) {
        console.log('❌ Este código ya existe. Por favor, elige otro\n');
        continue;
      }
      break;
    }

    // 4. Preguntar si se envían emails a suscriptores
    let sendEmails = false;
    while (true) {
      const sendInput = await question('📧 ¿Quieres enviar este descuento por email a los suscriptores de la newsletter? (yes/no): ');
      const v = sendInput.trim().toLowerCase();
      if (v === 'yes' || v === 'y' || v === 'si' || v === 's') {
        sendEmails = true;
        break;
      } else if (v === 'no' || v === 'n') {
        sendEmails = false;
        break;
      } else {
        console.log('❌ Respuesta no válida. Escribe yes o no.\n');
      }
    }
    
    // 3. Pedir fecha de expiración
    let expiryDate: Date | null = null;
    let expiryText = 'Permanente';
    
    while (true) {
      const expiryInput = await question('📅 ¿Hasta qué fecha quieres que dure? (YYYY-MM-DD) o "permanente": ');
      
      if (expiryInput.toLowerCase() === 'permanente' || expiryInput.toLowerCase() === 'p') {
        expiryDate = null;
        expiryText = 'Permanente';
        break;
      }
      
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(expiryInput)) {
        console.log('❌ Formato de fecha incorrecto. Usa YYYY-MM-DD o "permanente"\n');
        continue;
      }
      
      const inputDate = new Date(expiryInput + 'T23:59:59');
      if (isNaN(inputDate.getTime()) || inputDate <= new Date()) {
        console.log('❌ La fecha debe ser válida y futura\n');
        continue;
      }
      
      expiryDate = inputDate;
      expiryText = `expira el ${inputDate.toLocaleDateString('es-ES')}`;
      break;
    }
    
    // 4. Mostrar resumen y confirmar
  console.log('\n📋 === RESUMEN DEL CÓDIGO DE DESCUENTO ===');
  console.log(`💰 Descuento: ${discountPercentage}%`);
  console.log(`🏷️  Código: ${code}`);
  console.log(`📍 Aplica a: ${appliesTo === 'shipping' ? 'Envío' : 'Subtotal'}`);
  console.log(`📅 Vigencia: ${expiryText}`);
  console.log(`📧 Enviar emails a suscriptores: ${sendEmails ? 'Sí' : 'No'}`);
    console.log('===========================================\n');
    
    const confirmation = await question('✅ ¿Los datos son correctos? (yes/no): ');
    if (confirmation.toLowerCase() !== 'yes' && confirmation.toLowerCase() !== 'y' && confirmation.toLowerCase() !== 'si' && confirmation.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      return;
    }
    
    // 5. Crear el código de descuento en la base de datos
    console.log('\n💾 Guardando código de descuento...');
    const discountCode = new DiscountCode({
      code,
      discountPercentage,
      expiryDate,
      isActive: true,
      appliesTo
    });
    
    await discountCode.save();
    console.log('✅ Código de descuento guardado en la base de datos');
    
    // Contadores para reportes finales (declarados aquí para visibilidad fuera del bloque)
    let emailsSent = 0;
    let emailsFailed = 0;

    if (sendEmails) {
      // 6. Obtener clientes con promociones activadas (solo si se van a enviar emails)
      console.log('\n📧 Buscando clientes para envío de emails...');
      const subscribers = await Newsletter.find({
        'preferences.promotions': true
      });
      console.log(`📊 Encontrados ${subscribers.length} clientes con promociones activadas`);

      if (subscribers.length === 0) {
        console.log('ℹ️  No hay clientes con promociones activadas. El código se ha creado pero no se enviará ningún email.');
      } else {
        // 7. Enviar emails
        console.log('\n📬 Enviando emails...');
        for (const subscriber of subscribers) {
          // Comprobar de nuevo antes de cada envío por seguridad
          if (!sendEmails) {
            console.log('⚠️  Envío de emails cancelado durante el proceso. Saliendo del bucle.');
            break;
          }
          try {
            // Generar token para preferencias
            const token = generateNewsletterToken(subscriber.email);
            
            // Actualizar token en la base de datos
            subscriber.lastToken = token;
            await subscriber.save();
            
            // Siempre usar la URL de producción para los enlaces de email
            const preferencesUrl = `${process.env.FRONTEND_PRODUCTION_URL || process.env.FRONTEND_URL || 'https://www.cunadismoilustrado.me'}/newsletter/preferences?token=${token}`;

            const emailHTML = generateDiscountEmailHTML(
              discountPercentage,
              code,
              expiryText,
              '', // No tenemos nombres en la colección newsletter
              preferencesUrl
            );
            
            await sendEmail({
              to: subscriber.email,
              subject: `🎉 ¡${discountPercentage}% de descuento exclusivo para ti!`,
              html: emailHTML
            });
            
            emailsSent++;
            console.log(`✅ Email enviado a: ${subscriber.email}`);
            
          } catch (error) {
            emailsFailed++;
            console.log(`❌ Error enviando email a ${subscriber.email}:`, error);
          }
        }
        console.log(`\n🎉 === PROCESO DE EMAILS COMPLETADO ===`);
        console.log(`📧 Emails enviados: ${emailsSent}`);
        console.log(`❌ Emails fallidos: ${emailsFailed}`);
      }
    } else {
      console.log('ℹ️  Has elegido no enviar emails. El código se ha creado sin notificar a los suscriptores.');
    }
    
  console.log(`\n🎉 === PROCESO COMPLETADO ===`);
  console.log(`📧 Emails enviados: ${emailsSent}`);
  console.log(`❌ Emails fallidos: ${emailsFailed}`);
  console.log(`💰 Código de descuento "${code}" creado con ${discountPercentage}% de descuento`);
  console.log(`📍 Aplica a: ${appliesTo === 'shipping' ? 'Envío' : 'Subtotal'}`);
  console.log(`📅 Vigencia: ${expiryText}`);
  console.log(`📧 Enviado notificación a suscriptores: ${sendEmails ? 'Sí' : 'No'}`);
  console.log('==============================\n');
    
  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
  } finally {
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Ejecutar el script
console.log('🎬 Ejecutando función principal...');
createDiscountCode();

export { createDiscountCode };
