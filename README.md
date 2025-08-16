# Cuñadismo Ilustrado - Backend

Backend de la tienda online "Cuñadismo Ilustrado" construido con Node.js, Express y TypeScript.

## Características

- 🛍️ Integración con Printify para gestión de productos
- 💳 Pagos con Stripe
- 🚀 Despliegue en Heroku
- 📦 Procesamiento automático de pedidos
- 🔒 Manejo seguro de webhooks
- 📊 API REST bien estructurada

## Tecnologías

- Node.js 18+
- Express.js
- TypeScript
- Stripe para pagos
- Printify API para productos
- Axios para peticiones HTTP

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
NODE_ENV=production
PORT=3001
PRINTIFY_API_KEY=tu_printify_api_key
PRINTIFY_SHOP_ID=tu_shop_id
STRIPE_SECRET_KEY=tu_stripe_secret_key
STRIPE_WEBHOOK_SECRET=tu_stripe_webhook_secret
FRONTEND_URL=https://tu-frontend.herokuapp.com
ALLOWED_ORIGINS=https://tu-frontend.herokuapp.com
```

## API Endpoints

### Productos
- `GET /api/products` - Obtener todos los productos
- `GET /api/products/featured` - Productos destacados
- `GET /api/products/search` - Buscar productos
- `GET /api/products/:id` - Obtener producto específico
- `GET /api/products/:id/variants` - Variantes del producto

### Pedidos
- `POST /api/orders/payment-intent` - Crear intent de pago
- `POST /api/orders/checkout-session` - Crear sesión de checkout
- `POST /api/orders/process` - Procesar pedido
- `POST /api/orders/shipping` - Calcular costos de envío
- `GET /api/orders/:id/status` - Estado del pedido

### Webhooks
- `POST /api/webhooks/stripe` - Webhook de Stripe
- `POST /api/webhooks/printify` - Webhook de Printify

## Despliegue en Heroku

1. Crea una aplicación en Heroku:
```bash
heroku create cunao-backend
```

2. Configura las variables de entorno:
```bash
heroku config:set NODE_ENV=production
heroku config:set PRINTIFY_API_KEY=tu_key
heroku config:set STRIPE_SECRET_KEY=tu_key
# ... resto de variables
```

3. Despliega:
```bash
git push heroku main
```

## Estructura del Proyecto

```
src/
├── controllers/     # Controladores de rutas
├── services/        # Servicios de terceros (Stripe, Printify)
├── routes/          # Definición de rutas
├── middleware/      # Middleware personalizado
├── types/           # Tipos de TypeScript
└── server.ts        # Servidor principal
```

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
