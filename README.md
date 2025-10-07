# Cuñadismo Ilustrado - Backend

Backend de la tienda online "Cuñadismo Ilustrado" construido con Node.js, Express y TypeScript. Una plataforma completa de e-commerce con integración de servicios de terceros y automatización completa del flujo de pedidos.

## 🚀 Características Principales

- 🛍️ **Integración con Printify** - Gestión automática de productos y cumplimiento POD
- 💳 **Pagos con Stripe** - Payment Intents, Checkout Sessions y gestión de webhooks
- 📧 **Sistema de Newsletter** - Preferencias personalizadas y envío automático semanal
- 📦 **Procesamiento automático de pedidos** - Seguimiento en tiempo real con Printify
- 🔒 **Webhooks seguros** - Validación HMAC para Stripe y Printify
- 📊 **API REST completa** - CRUD para productos, pedidos, reviews, newsletters
- 🗄️ **MongoDB** - Base de datos NoSQL con Mongoose ODM
- ⏰ **Cron Jobs** - Tareas programadas para newsletters, descuentos y limpieza
- 🔐 **Autenticación Admin** - Sistema de tokens JWT para panel administrativo
- 📱 **CORS configurado** - Soporte para múltiples dominios
- 🛡️ **Validación robusta** - Express-validator en todas las rutas
- 🎁 **Sistema de descuentos** - Códigos promocionales con validación y límites
- ⭐ **Sistema de reviews** - Calificaciones y comentarios de clientes
- 📈 **Analytics** - Seguimiento de ventas, productos más vendidos, estadísticas

## 🛠️ Tecnologías

### Core
- **Node.js 18+** - Runtime de JavaScript
- **Express.js 4.x** - Framework web minimalista
- **TypeScript 5.x** - Tipado estático y mejor DX

### Base de Datos
- **MongoDB** - Base de datos NoSQL
- **Mongoose 8.x** - ODM con schemas y validaciones

### Integraciones
- **Stripe API** - Procesamiento de pagos
- **Printify API** - Print on Demand y fulfillment
- **Nodemailer** - Envío de emails transaccionales
- **Google Analytics** - Tracking de eventos

### Utilidades
- **node-cron** - Programación de tareas periódicas
- **crypto** - Generación segura de tokens y HMAC
- **Axios** - Cliente HTTP para APIs externas
- **bcryptjs** - Hashing de contraseñas
- **express-validator** - Validación de datos de entrada
- **multer** - Manejo de uploads de archivos
- **sharp** - Procesamiento de imágenes

### Testing
- **Jest** - Framework de testing
- **Supertest** - Testing de endpoints HTTP
- **mongodb-memory-server** - MongoDB en memoria para tests
- **nock** - Mocking de HTTP requests

## 📁 Estructura del Proyecto

```
cunao-backend/
├── src/
│   ├── controllers/        # Lógica de negocio por feature
│   ├── routes/             # Definición de rutas API
│   ├── services/           # Servicios externos e internos
│   ├── models/             # Schemas de MongoDB
│   ├── cron/               # Tareas programadas
│   ├── middleware/         # Middlewares personalizados
│   ├── types/              # Definiciones TypeScript
│   ├── utils/              # Utilidades helpers
│   └── server.ts           # Punto de entrada
├── scripts/                # Scripts de utilidad
├── __tests__/              # Tests (107 tests)
│   ├── integration/
│   └── unit/
├── .github/workflows/      # 16 GitHub Actions workflows
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## 🔧 Instalación

### 1. Clonar e instalar

```bash
git clone https://github.com/CodeInIA/cunao-backend.git
cd cunao-backend
npm install
```

### 2. Variables de entorno

Crea `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/cunao

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Printify
PRINTIFY_API_TOKEN=your_token
PRINTIFY_SHOP_ID=your_shop_id

# Email
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password

# Frontend
FRONTEND_URL=http://localhost:5173

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tu_password
JWT_SECRET=tu_jwt_secret
```

### 3. Iniciar

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## 🧪 Testing

**107 tests passing** cubriendo todas las funcionalidades:

```bash
# Todos los tests
npm test

# Con coverage
npm run test:coverage

# Tests específicos
npm test -- orderController.test.ts
```

### Coverage
- Controllers: 100%
- Services: 100%
- Models: 100%
- Utils: 100%
- Integration: E2E purchase flow

## 📡 API Endpoints

### Products
```
GET    /api/products
GET    /api/products/:id
```

### Orders
```
POST   /api/orders
GET    /api/orders/:id
POST   /api/orders/:id/cancel
```

### Discounts
```
POST   /api/discounts/validate
GET    /api/discounts/:code
POST   /api/discounts          # Admin
```

### Reviews
```
GET    /api/reviews
POST   /api/reviews
PUT    /api/reviews/:id        # Admin
```

### Newsletter
```
POST   /api/newsletter/subscribe
POST   /api/newsletter/unsubscribe
GET    /api/newsletter/preferences/:token
```

### Analytics (Admin)
```
GET    /api/analytics/sales
GET    /api/analytics/products
GET    /api/analytics/overview
```

### Webhooks
```
POST   /api/webhooks/stripe
POST   /api/webhooks/printify
```

## ⚙️ Cron Jobs

| Job | Frecuencia | Descripción |
|-----|------------|-------------|
| Weekly Newsletter | Dom 10:00 | Envía newsletter a suscriptores |
| Weekly Products | Dom 09:00 | Selecciona productos destacados |
| Activate Discounts | Cada hora | Activa descuentos programados |
| Cleanup Orders | Diario 02:00 | Limpia órdenes expiradas |
| Create Discount | Lun 00:00 | Genera códigos semanales |

## 🔄 Flujo de Compra

1. Cliente navega → `GET /api/products`
2. Añade al carrito → Frontend (Zustand)
3. Aplica descuento → `POST /api/discounts/validate`
4. Inicia checkout → `POST /api/orders` (Payment Intent)
5. Paga con Stripe → Frontend
6. Webhook Stripe → `POST /api/webhooks/stripe`
7. Crea orden Printify → Automático
8. Webhook Printify → `POST /api/webhooks/printify`
9. Email confirmación → Automático

## 🔐 Seguridad

- ✅ HTTPS only en producción
- ✅ CORS configurado
- ✅ Webhook signatures validadas
- ✅ Rate limiting
- ✅ Input validation
- ✅ JWT tokens
- ✅ Bcrypt passwords
- ✅ Environment variables

## 🚀 Despliegue Heroku

```bash
heroku create cunao-backend
heroku config:set MONGODB_URI=...
heroku config:set STRIPE_SECRET_KEY=...
git push heroku master
```

## 📊 CI/CD (16 Workflows)

### Principales
- **CI** - Lint, tests, build en push/PR
- **Full Suite** - Tests semanales con coverage
- **Security** - Auditoría diaria
- **Deployment** - Deploy automático

### Por Feature
Orders, Products, Discounts, Reviews, Newsletter, Admin, Analytics, Images, Webhooks, Contact, Cron Jobs, Database

## 🧑‍💻 Scripts

```bash
npm run dev              # Desarrollo con nodemon
npm run build            # Compila TypeScript
npm start                # Producción
npm test                 # Tests
npm run create:admin     # Crea usuario admin
npm run test:email       # Prueba emails
```

## 📝 Modelos Principales

### Order
```typescript
{
  orderId: string;
  stripePaymentIntentId: string;
  printifyOrderId?: string;
  customerEmail: string;
  items: CartItem[];
  shippingAddress: Address;
  discountCode?: string;
  total: number;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}
```

### Newsletter
```typescript
{
  email: string;
  preferences: {
    newProducts: boolean;
    sales: boolean;
    blog: boolean;
  };
  token: string;
  subscribed: boolean;
}
```

### Review
```typescript
{
  productId: string;
  customerName: string;
  rating: number;  // 1-5
  comment: string;
  verified: boolean;
  approved: boolean;
}
```

### DiscountCode
```typescript
{
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minPurchase?: number;
  maxUses?: number;
  usedCount: number;
  active: boolean;
}
```

## 👥 Autor

**Cuñadismo Ilustrado**
- GitHub: [@CodeInIA](https://github.com/CodeInIA)

---

**Estado**: ✅ En producción | **Tests**: 107/107 ✅ | **CI/CD**: 16 workflows ✅
