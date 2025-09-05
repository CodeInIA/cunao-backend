import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import Newsletter from '../models/Newsletter';
import { ApiResponse } from '../types';

interface NewsletterSubscriptionData {
  email: string;
}

// Dominios temporales/desechables bloqueados
const blockedDomains = [
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.org',
  'yopmail.com', 'temp-mail.org', 'throwaway.email', 'getnada.com',
  'maildrop.cc', 'mailnesia.com', 'trashmail.com', '33mail.com',
  'dispostable.com', 'fake-mail.ml', 'mohmal.com', 'emailfake.com'
];

// Validar dominio de email
function validateEmailDomain(email: string): { isValid: boolean; suggestion?: string } {
  const emailDomain = email.toLowerCase().split('@')[1];
  
  if (!emailDomain) {
    return { isValid: false };
  }
  
  // Verificar si está en la lista de dominios bloqueados
  if (blockedDomains.includes(emailDomain)) {
    return { isValid: false };
  }
  
  // Sugerencias para dominios comunes mal escritos
  const commonDomains: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'hotmial.com': 'hotmail.com',
    'yahooo.com': 'yahoo.com',
    'outlok.com': 'outlook.com'
  };
  
  if (commonDomains[emailDomain]) {
    return { isValid: false, suggestion: email.replace(emailDomain, commonDomains[emailDomain]) };
  }
  
  return { isValid: true };
}

export const subscribeToNewsletter = asyncHandler(async (req: Request, res: Response) => {
  const { email }: NewsletterSubscriptionData = req.body;

  // Validación de campo requerido
  if (!email) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'El email es requerido'
    };
    return res.status(400).json(response);
  }

  // Validación de formato de email
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email.trim()) || email.length > 100) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'El formato del email no es válido'
    };
    return res.status(400).json(response);
  }

  // Validar dominio
  const domainValidation = validateEmailDomain(email.trim());
  if (!domainValidation.isValid) {
    const response: ApiResponse<null> = {
      success: false,
      error: domainValidation.suggestion 
        ? `¿Quisiste decir ${domainValidation.suggestion}?`
        : 'Este dominio de email no está permitido'
    };
    return res.status(400).json(response);
  }

  try {
    // Verificar si ya existe
    const existingSubscription = await Newsletter.findOne({ email: email.toLowerCase().trim() });
    
    if (existingSubscription) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Este email ya está suscrito a nuestra newsletter'
      };
      return res.status(409).json(response);
    }

    // Crear nueva suscripción
    const newSubscription = new Newsletter({
      email: email.toLowerCase().trim()
    });

    await newSubscription.save();

    console.log(`Nueva suscripción a newsletter: ${email}`);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Suscripción exitosa' },
      message: '¡Te has suscrito exitosamente a nuestra newsletter!'
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('Error suscribiendo a newsletter:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al procesar la suscripción. Inténtalo de nuevo más tarde.'
    };
    
    res.status(500).json(response);
  }
});
