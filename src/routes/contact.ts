import { Router } from 'express';
import { sendContactForm } from '../controllers/contactController.js';

const router = Router();

// Ruta para enviar formulario de contacto
router.post('/send', sendContactForm);

export default router;
