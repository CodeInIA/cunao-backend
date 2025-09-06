# Cuñadismo Ilustrado - Backend

Backend de la tienda online "Cuñadismo Ilustrado" construido con Node.js, Express y TypeScript. Una plataforma completa de e-commerce con integración de servicios de terceros y automatización completa del flujo de pedidos.

## Características

- 🛍️ **Integración con Printify** para gestión automática de productos y cumplimiento
- 💳 **Pagos con Stripe** - Payment Intents y Checkout Sessions
- 📧 **Sistema de Newsletter** con preferencias personalizadas y envío automático
- 🚀 **Despliegue en Heroku** con configuración optimizada
- 📦 **Procesamiento automático de pedidos** con seguimiento en tiempo real
- 🔒 **Manejo seguro de webhooks** de Stripe y Printify
- 📊 **API REST bien estructurada** con validación y manejo de errores
- 🗄️ **Base de datos MongoDB** para gestión de suscriptores y preferencias
- ⏰ **Cron jobs automáticos** para envío de newsletters semanales
- 🔐 **Autenticación por tokens** para gestión de preferencias
- 📱 **CORS configurado** para múltiples dominios
- 🛡️ **Validación robusta** de emails y datos de entrada

## Tecnologías

- **Node.js 18+** - Runtime de JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipado estático
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **Stripe** - Procesamiento de pagos
- **Printify API** - Gestión de productos POD
- **Nodemailer** - Envío de emails
- **node-cron** - Programación de tareas
- **crypto** - Generación segura de tokens
- **Axios** - Cliente HTTP
- **express-validator** - Validación de datos

## Instalación

1. Clona el repositorio:
```bash
git clone <tu-repo>
cd cunao-backend
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
# Edita .env con tus claves de API
```

4. Compila TypeScript:
```bash
npm run build
```

5. Ejecuta en desarrollo:
```bash
npm run dev
```

## Variables de Entorno

```env
# Entorno y servidor
NODE_ENV=production
PORT=3001

# Base de datos
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/cunao

# APIs de terceros
PRINTIFY_API_KEY=tu_printify_api_key
PRINTIFY_SHOP_ID=tu_shop_id
STRIPE_SECRET_KEY=tu_stripe_secret_key
STRIPE_WEBHOOK_SECRET=tu_stripe_webhook_secret

# URLs y CORS
FRONTEND_URL=https://cunadismoilustrado.me
ALLOWED_ORIGINS=https://cunadismoilustrado.me,https://www.cunadismoilustrado.me

# Newsletter y email
NEWSLETTER_SECRET=tu_clave_secreta_para_tokens
EMAIL_SERVICE_API_KEY=tu_clave_de_servicio_email
EMAIL_FROM=newsletter@cunadismoilustrado.me

# Configuración de cron jobs
NEWSLETTER_CRON_ENABLED=true
NEWSLETTER_CRON_SCHEDULE=0 18 * * 6  # Sábados a las 18:00
```

## API Endpoints

### Productos
- `GET /api/products` - Obtener todos los productos
- `GET /api/products/featured` - Productos destacados
- `GET /api/products/search?q=query` - Buscar productos por texto
- `GET /api/products/:id` - Obtener producto específico
- `GET /api/products/:id/variants` - Variantes del producto
- `GET /api/products/:id/gpsr` - Información GPSR del producto

### Pedidos
- `POST /api/orders/payment-intent` - Crear intent de pago
- `POST /api/orders/checkout-session` - Crear sesión de checkout
- `POST /api/orders/process` - Procesar pedido completo
- `POST /api/orders/shipping` - Calcular costos de envío
- `GET /api/orders/:id/status` - Estado del pedido

### Newsletter
- `POST /api/newsletter/subscribe` - Suscribirse al newsletter
- `POST /api/newsletter/validate-token` - Validar token de acceso
- `PUT /api/newsletter/preferences` - Actualizar preferencias
- `POST /api/newsletter/send-manual` - Envío manual (admin)
- `POST /api/newsletter/update-marketing-preferences` - Preferencias de marketing

### Webhooks
- `POST /api/webhooks/stripe` - Webhook de Stripe para pagos
- `POST /api/webhooks/printify` - Webhook de Printify para pedidos

### Configuración
- `GET /api/config/shipping` - Configuración de envíos por país

## Despliegue en Heroku

1. Crea una aplicación en Heroku:
```bash
heroku create cunao-backend
```

2. Configura las variables de entorno:
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=tu_mongodb_uri
heroku config:set PRINTIFY_API_KEY=tu_key
heroku config:set STRIPE_SECRET_KEY=tu_key
heroku config:set FRONTEND_URL=https://cunadismoilustrado.me
heroku config:set NEWSLETTER_SECRET=tu_clave_secreta
# ... resto de variables
```

3. Configura el addon de MongoDB (opcional):
```bash
heroku addons:create mongolab:sandbox
```

4. Despliega:
```bash
git push heroku main
```

5. Configura cron jobs (para newsletter):
```bash
heroku addons:create scheduler:standard
# Configura el job: npm run newsletter:send
```

## Estructura del Proyecto

```
src/
├── controllers/         # Controladores de rutas
│   ├── orderController.ts
│   ├── productController.ts
│   ├── newsletterController.ts
│   ├── webhookController.ts
│   └── configController.ts
├── services/           # Servicios de terceros
│   ├── stripeService.ts
│   ├── printifyService.ts
│   ├── emailService.ts
│   ├── databaseService.ts
│   └── notificationService.ts
├── routes/             # Definición de rutas
│   ├── orders.ts
│   ├── products.ts
│   ├── newsletter.ts
│   ├── webhooks.ts
│   └── config.ts
├── middleware/         # Middleware personalizado
│   └── errorHandler.ts
├── models/             # Modelos de MongoDB
│   └── Newsletter.ts
├── cron/              # Tareas programadas
│   ├── weeklyNewsletter.ts
│   └── cancelAllPrintifyOrders.ts
├── types/             # Tipos de TypeScript
│   └── index.ts
└── server.ts          # Servidor principal
```

## Sistema de Newsletter

El backend incluye un sistema completo de newsletter con:

### Características del Newsletter
- **52 frases cuñao diferentes** - Una para cada semana del año
- **Envío automático semanal** - Sábados a las 18:00
- **Gestión de preferencias** - Newsletter, promociones, nuevos productos
- **Autenticación por tokens** - Enlaces seguros para gestionar preferencias
- **Plantilla HTML responsive** - Diseño oscuro acorde con la marca
- **Validación robusta de emails** - Anti-spam y dominios confiables

### Flujo del Newsletter
1. Usuario se suscribe desde el footer del frontend
2. Sistema valida email y crea entrada en MongoDB
3. Cron job semanal envía newsletter con frase de la semana
4. Emails incluyen token para gestionar preferencias
5. Usuario puede modificar preferencias sin re-autenticación

### Gestión de Suscripciones
- **Nueva suscripción**: Email nuevo → Crear con `newsletter: true`
- **Re-suscripción**: Email existente con `newsletter: false` → Cambiar a `true`
- **Ya suscrito**: Email existente con `newsletter: true` → Error amigable

## Integración con Printify

El backend se conecta automáticamente con Printify para:
- Obtener productos y variantes
- Crear pedidos automáticamente
- Enviar pedidos a producción
- Recibir actualizaciones via webhooks

## Integración con Stripe

Manejo completo de pagos:
- Payment Intents para pagos seguros
- Checkout Sessions para experiencia simplificada
- Webhooks para confirmar pagos
- Cálculo automático de totales

## Desarrollo

```bash
# Modo desarrollo con recarga automática
npm run dev

# Compilar TypeScript
npm run build

# Ejecutar en producción
npm start

# Ejecutar tests
npm test
```

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## Licencia

MIT
