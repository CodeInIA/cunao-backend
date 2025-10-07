# 🏪 Cuñadismo Ilustrado - Backend

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Latest-008CDD?style=for-the-badge&logo=stripe&logoColor=white)

Backend RESTful API para la tienda online "Cuñadismo Ilustrado" - Una plataforma completa de e-commerce con integración de Print on Demand, procesamiento de pagos, automatización de pedidos y gestión de contenido.

[Características](#-características-principales) •
[Instalación](#-instalación) •
[API](#-api-endpoints) •
[Documentación](#-documentación)

</div>

---

## � Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Tecnologías](#️-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#️-configuración)
- [Uso](#-uso)
- [API Endpoints](#-api-endpoints)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Cron Jobs](#-cron-jobs)
- [Testing](#-testing)
- [Despliegue](#-despliegue)
- [Variables de Entorno](#-variables-de-entorno)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

## � Características Principales

### 🛍️ E-commerce Completo
- **Catálogo de productos** con integración directa con Printify API
- **Gestión de pedidos** con seguimiento en tiempo real
- **Sistema de descuentos** con códigos promocionales y validación
- **Reviews y calificaciones** de productos por clientes verificados
- **Carrito de compras** con persistencia y validación de stock

### � Procesamiento de Pagos
- **Stripe Payment Intents** para pagos seguros
- **Checkout Sessions** para flujo de pago optimizado
- **Webhooks seguros** con validación HMAC
- **Gestión de reembolsos** y cancelaciones automáticas
- **Multi-moneda** (EUR, USD)

### 📦 Print on Demand (Printify)
- **Sincronización automática** de productos
- **Creación de pedidos POD** sin intervención manual
- **Actualización de estados** vía webhooks
- **Gestión de variantes** y precios dinámicos
- **Imágenes optimizadas** con Cloudinary

### 📧 Sistema de Newsletter
- **Suscripción con preferencias** personalizadas
- **Envío automático semanal** con cron jobs
- **Gestión de listas** de contactos
- **Plantillas HTML** responsivas
- **Estadísticas de apertura** y clics

### 🔐 Seguridad y Autenticación
- **JWT** para autenticación de administradores
- **Bcrypt** para hashing de contraseñas
- **Rate limiting** por IP
- **Helmet** para headers de seguridad HTTP
- **CORS configurado** para múltiples dominios
- **Validación robusta** con express-validator

### 📊 Analytics y Reportes
- **Dashboard de ventas** con métricas en tiempo real
- **Productos más vendidos** por período
- **Análisis de clientes** y comportamiento
- **Integración con Google Analytics** 4
- **Exportación de datos** en CSV/JSON

### ⏰ Automatización
- **Newsletters semanales** programadas
- **Limpieza automática** de pedidos expirados
- **Activación de descuentos** programados
- **Productos destacados** de la semana
- **Cancelación de pedidos** no pagados

## 🛠️ Tecnologías

### Core Framework
- **[Node.js](https://nodejs.org/)** `18+` - Runtime de JavaScript
- **[Express.js](https://expressjs.com/)** `5.x` - Framework web minimalista y rápido
- **[TypeScript](https://www.typescriptlang.org/)** `5.x` - Superset tipado de JavaScript

### Base de Datos
- **[MongoDB](https://www.mongodb.com/)** `8.x` - Base de datos NoSQL orientada a documentos
- **[Mongoose](https://mongoosejs.com/)** `8.x` - ODM elegante con schemas y validaciones

### Integraciones de Terceros
- **[Stripe](https://stripe.com/)** `19.x` - Procesamiento de pagos y checkout
- **[Printify API](https://printify.com/)** - Print on Demand y fulfillment automatizado
- **[Cloudinary](https://cloudinary.com/)** `2.x` - Gestión y optimización de imágenes
- **[Nodemailer](https://nodemailer.com/)** `7.x` - Envío de emails transaccionales

### Seguridad y Validación
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** `3.x` - Hashing de contraseñas
- **[jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)** `9.x` - Tokens JWT
- **[express-validator](https://express-validator.github.io/)** `7.x` - Validación de datos
- **[helmet](https://helmetjs.github.io/)** `8.x` - Headers de seguridad HTTP
- **[express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)** `8.x` - Rate limiting

### Utilidades y Herramientas
- **[node-cron](https://github.com/node-cron/node-cron)** `4.x` - Programación de tareas
- **[axios](https://axios-http.com/)** `1.x` - Cliente HTTP con promesas
- **[sharp](https://sharp.pixelplumbing.com/)** `0.34.x` - Procesamiento de imágenes
- **[multer](https://github.com/expressjs/multer)** `2.x` - Uploads multipart/form-data
- **[compression](https://github.com/expressjs/compression)** `1.x` - Compresión Gzip/Brotli
- **[cors](https://github.com/expressjs/cors)** `2.x` - Cross-Origin Resource Sharing
- **[cookie-parser](https://github.com/expressjs/cookie-parser)** `1.x` - Parsing de cookies
- **[dotenv](https://github.com/motdotla/dotenv)** `17.x` - Variables de entorno

### Testing
- **[Jest](https://jestjs.io/)** `30.x` - Framework de testing completo
- **[Supertest](https://github.com/visionmedia/supertest)** `6.x` - Testing de HTTP endpoints
- **[ts-jest](https://kulshekhar.github.io/ts-jest/)** - Preset TypeScript para Jest

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** >= 18.0.0 ([Descargar](https://nodejs.org/))
- **npm** >= 9.0.0 (incluido con Node.js)
- **MongoDB** >= 6.0 ([Descargar](https://www.mongodb.com/try/download/community)) o cuenta en MongoDB Atlas
- **Git** ([Descargar](https://git-scm.com/))

### Cuentas de Servicios Necesarias

- **[Stripe](https://dashboard.stripe.com/register)** - Para procesamiento de pagos
- **[Printify](https://printify.com/)** - Para Print on Demand
- **[Cloudinary](https://cloudinary.com/)** (Opcional) - Para gestión de imágenes
- **Gmail** o servicio SMTP - Para envío de emails

## 🔧 Instalación

### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/CodeInIA/cunao-backend.git
cd cunao-backend
```

### 2️⃣ Instalar Dependencias

```bash
npm install
```

### 3️⃣ Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# ======================
# SERVER CONFIGURATION
# ======================
PORT=3000
NODE_ENV=development

# ======================
# DATABASE
# ======================
MONGODB_URI=mongodb://localhost:27017/cunao
# O para MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/cunao

# ======================
# STRIPE
# ======================
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# ======================
# PRINTIFY
# ======================
PRINTIFY_API_TOKEN=your_printify_api_token
PRINTIFY_SHOP_ID=your_shop_id

# ======================
# CLOUDINARY (Opcional)
# ======================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ======================
# EMAIL SERVICE
# ======================
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password
EMAIL_FROM="Cuñadismo Ilustrado <noreply@cunaoilustrado.com>"

# ======================
# FRONTEND
# ======================
FRONTEND_URL=http://localhost:5173
# En producción:
# FRONTEND_URL=https://tu-dominio.com

# ======================
# ADMIN
# ======================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tu_password_seguro
JWT_SECRET=tu_jwt_secret_muy_largo_y_aleatorio

# ======================
# GOOGLE ANALYTICS
# ======================
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_API_SECRET=your_ga_api_secret

# ======================
# SECURITY
# ======================
ALLOWED_ORIGINS=http://localhost:5173,https://tu-dominio.com
```

### 4️⃣ Iniciar MongoDB (Local)

```bash
# Windows (con MongoDB instalado)
mongod

# Linux/Mac
sudo systemctl start mongod

# O usa MongoDB Atlas (recomendado)
```

### 5️⃣ Crear Usuario Admin (Opcional)

```bash
npm run create-admin
```

## 🚀 Uso

### Modo Desarrollo

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3000` con hot-reload automático.

### Modo Producción

```bash
# Compilar TypeScript a JavaScript
npm run build

# Iniciar servidor compilado
npm start
```

### Scripts Disponibles

```bash
npm run dev              # Inicia en modo desarrollo con tsx watch
npm run build            # Compila TypeScript → JavaScript
npm start                # Inicia servidor en producción
npm test                 # Ejecuta todos los tests
npm run test:coverage    # Tests con reporte de cobertura
npm run lint             # Ejecuta ESLint (si configurado)

# Cron Jobs Manuales
npm run cancel-orders    # Cancela pedidos Printify
npm run cleanup-orders   # Limpia pedidos expirados
npm run create-discount  # Genera código de descuento
```

## 📁 Estructura del Proyecto

```
cunao-backend/
├── src/
│   ├── controllers/           # Lógica de negocio por feature
│   │   ├── adminController.ts
│   │   ├── analyticsController.ts
│   │   ├── configController.ts
│   │   ├── contactController.ts
│   │   ├── discountController.ts
│   │   ├── imageController.ts
│   │   ├── newsletterController.ts
│   │   ├── orderController.ts
│   │   ├── productController.ts
│   │   ├── reviewController.ts
│   │   ├── webhookController.ts
│   │   └── weeklyProductsController.ts
│   │
│   ├── routes/                # Definición de endpoints
│   │   ├── admin.ts
│   │   ├── analytics.ts
│   │   ├── config.ts
│   │   ├── contact.ts
│   │   ├── discounts.ts
│   │   ├── images.ts
│   │   ├── newsletter.ts
│   │   ├── orders.ts
│   │   ├── products.ts
│   │   ├── reviews.ts
│   │   ├── webhooks.ts
│   │   └── weeklyProducts.ts
│   │
│   ├── services/              # Servicios externos e internos
│   │   ├── databaseService.ts       # MongoDB connection
│   │   ├── emailService.ts          # Nodemailer
│   │   ├── imageService.ts          # Cloudinary
│   │   ├── notificationService.ts   # Google Analytics
│   │   ├── printifyService.ts       # Printify API
│   │   └── stripeService.ts         # Stripe API
│   │
│   ├── models/                # Schemas de Mongoose
│   │   ├── Client.ts
│   │   ├── DiscountCode.ts
│   │   ├── Newsletter.ts
│   │   ├── Review.ts
│   │   ├── User.ts
│   │   └── WeeklyProducts.ts
│   │
│   ├── cron/                  # Tareas programadas
│   │   ├── activateScheduledDiscounts.ts
│   │   ├── cancelAllPrintifyOrders.ts
│   │   ├── cleanupExpiredOrders.ts
│   │   ├── createDiscountCode.ts
│   │   ├── weeklyNewProducts.ts
│   │   └── weeklyNewsletter.ts
│   │
│   ├── middleware/            # Middlewares personalizados
│   │   ├── adminAuth.ts           # Autenticación JWT
│   │   └── errorHandler.ts        # Manejo de errores global
│   │
│   ├── types/                 # Definiciones TypeScript
│   │   ├── index.ts
│   │   └── multer.d.ts
│   │
│   ├── utils/                 # Funciones auxiliares
│   │   └── imageUtils.ts
│   │
│   └── server.ts              # 🚀 Punto de entrada
│
├── scripts/                   # Scripts de utilidad
│   ├── createAdmin.ts
│   └── testDeliveryEmail.ts
│
├── __tests__/                 # Suite de tests (107 tests)
│   ├── controllers/
│   ├── models/
│   ├── services/
│   ├── utils/
│   └── integration/
│
├── .github/
│   └── workflows/             # 16 GitHub Actions workflows
│
├── dist/                      # Código compilado (generado)
├── node_modules/              # Dependencias (generado)
├── .env                       # Variables de entorno (no versionado)
├── .gitignore
├── jest.config.js             # Configuración Jest
├── package.json
├── Procfile                   # Para Heroku
├── README.md
├── tsconfig.json              # Configuración TypeScript
└── webhook-hash-calculator.js # Utilidad webhooks
```

## 📡 API Endpoints

### 🛍️ Products

```http
GET    /api/products              # Obtener todos los productos
GET    /api/products/:id          # Obtener producto por ID
GET    /api/products/sku/:sku     # Obtener producto por SKU
```

**Ejemplo de respuesta:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Camiseta Cuñao Clásico",
  "description": "La esencia del cuñadismo español",
  "variants": [
    {
      "id": "variant_123",
      "title": "M / Blanco",
      "price": 2499,
      "is_available": true
    }
  ],
  "images": ["https://..."],
  "tags": ["camiseta", "humor"],
  "is_visible": true
}
```

### 📦 Orders

```http
POST   /api/orders                      # Crear nueva orden
GET    /api/orders/:id                  # Obtener orden por ID
POST   /api/orders/:id/cancel           # Cancelar orden
GET    /api/orders/status/:orderId      # Estado de orden Printify
```

**Crear orden:**
```json
{
  "items": [
    {
      "variant_id": "variant_123",
      "quantity": 2,
      "product_id": "prod_xyz"
    }
  ],
  "shipping_address": {
    "first_name": "Juan",
    "last_name": "García",
    "email": "juan@example.com",
    "phone": "+34600000000",
    "address1": "Calle Mayor 1",
    "city": "Madrid",
    "zip": "28001",
    "country": "ES"
  },
  "discount_code": "CUNAO10"
}
```

### 🎁 Discounts

```http
POST   /api/discounts/validate          # Validar código de descuento
GET    /api/discounts/:code             # Obtener descuento por código
POST   /api/discounts                   # Crear descuento (Admin)
PUT    /api/discounts/:id               # Actualizar descuento (Admin)
DELETE /api/discounts/:id               # Eliminar descuento (Admin)
GET    /api/discounts                   # Listar todos (Admin)
```

**Validar descuento:**
```json
{
  "code": "CUNAO10",
  "subtotal": 2999
}
```

**Respuesta:**
```json
{
  "valid": true,
  "discount": {
    "code": "CUNAO10",
    "type": "percentage",
    "value": 10,
    "minimum_purchase": 2000
  },
  "discount_amount": 300
}
```

### ⭐ Reviews

```http
GET    /api/reviews                     # Obtener reviews paginadas
GET    /api/reviews/product/:id         # Reviews de producto específico
POST   /api/reviews                     # Crear review
PUT    /api/reviews/:id                 # Actualizar review (Admin)
DELETE /api/reviews/:id                 # Eliminar review (Admin)
GET    /api/reviews/stats/:productId    # Estadísticas de reviews
```

**Crear review:**
```json
{
  "product_id": "prod_xyz",
  "order_id": "order_abc",
  "customer_name": "Juan G.",
  "rating": 5,
  "comment": "Calidad excelente, diseño divertido"
}
```

### 📧 Newsletter

```http
POST   /api/newsletter/subscribe              # Suscribirse
POST   /api/newsletter/unsubscribe            # Darse de baja
GET    /api/newsletter/preferences/:token     # Ver preferencias
PUT    /api/newsletter/preferences/:token     # Actualizar preferencias
POST   /api/newsletter/send                   # Enviar newsletter (Admin)
GET    /api/newsletter/subscribers            # Listar suscriptores (Admin)
```

**Suscribirse:**
```json
{
  "email": "usuario@example.com",
  "name": "Juan García",
  "preferences": {
    "new_products": true,
    "promotions": true,
    "weekly_newsletter": true
  }
}
```

### 📊 Analytics (Admin)

```http
GET    /api/analytics/sales               # Estadísticas de ventas
GET    /api/analytics/products            # Productos más vendidos
GET    /api/analytics/overview            # Resumen general
GET    /api/analytics/revenue             # Ingresos por período
GET    /api/analytics/customers           # Análisis de clientes
```

**Query params:**
```
?startDate=2024-01-01&endDate=2024-12-31&period=month
```

### 🔐 Admin

```http
POST   /api/admin/login                   # Autenticación
GET    /api/admin/verify                  # Verificar token
POST   /api/admin/logout                  # Cerrar sesión
```

### 🪝 Webhooks

```http
POST   /api/webhooks/stripe               # Webhook de Stripe
POST   /api/webhooks/printify             # Webhook de Printify
```

### 📸 Images

```http
POST   /api/images/upload                 # Subir imagen (Admin)
DELETE /api/images/:publicId              # Eliminar imagen (Admin)
```

### 📞 Contact

```http
POST   /api/contact                       # Enviar mensaje de contacto
```

### 🎯 Weekly Products

```http
GET    /api/weekly-products               # Obtener productos destacados
POST   /api/weekly-products               # Actualizar productos (Admin)
```

### ⚙️ Config

```http
GET    /api/config                        # Obtener configuración pública
```

## 🧪 Testing

El proyecto cuenta con **107 tests** que cubren todas las funcionalidades críticas con **100% de cobertura**.

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Con reporte de cobertura
npm run test:coverage

# Tests específicos
npm test -- orderController.test.ts
npm test -- services/
```

### Cobertura por Módulo

| Módulo | Cobertura | Tests |
|--------|-----------|-------|
| **Controllers** | 100% | 45 tests |
| **Services** | 100% | 32 tests |
| **Models** | 100% | 15 tests |
| **Utils** | 100% | 8 tests |
| **Integration** | E2E | 7 tests |

### Tests de Integración

Los tests E2E cubren el flujo completo de compra:

1. ✅ Navegación de productos
2. ✅ Validación de descuentos
3. ✅ Creación de orden
4. ✅ Payment Intent de Stripe
5. ✅ Webhook de confirmación
6. ✅ Creación de orden Printify
7. ✅ Email de confirmación

```bash
# Ejecutar solo tests de integración
npm test -- integration/
```

## ⏰ Cron Jobs

El sistema cuenta con **6 tareas programadas** para automatización:

### 📅 Calendario de Ejecución

| Tarea | Frecuencia | Hora | Descripción |
|-------|------------|------|-------------|
| **Weekly Newsletter** | Domingos | 10:00 AM | Envía newsletter semanal a suscriptores activos |
| **Weekly Products** | Domingos | 09:00 AM | Selecciona productos destacados de la semana |
| **Activate Discounts** | Cada hora | XX:00 | Activa descuentos programados |
| **Cleanup Orders** | Diario | 02:00 AM | Limpia órdenes expiradas (>30 días) |
| **Create Discount** | Lunes | 00:01 AM | Genera código de descuento semanal |
| **Cancel Orders** | Manual | - | Cancela pedidos pendientes en Printify |

### Ejecución Manual

```bash
# Newsletter semanal
npm run weekly-newsletter

# Productos destacados
npm run weekly-products

# Activar descuentos programados
npm run activate-discounts

# Limpiar pedidos expirados
npm run cleanup-orders

# Crear código de descuento
npm run create-discount

# Cancelar pedidos Printify
npm run cancel-orders
```

### Configuración

Los cron jobs se definen en `src/cron/` y se inicializan en `server.ts`:

```typescript
// Ejemplo: Newsletter semanal (Domingos 10:00)
cron.schedule('0 10 * * 0', async () => {
  console.log('🔄 Ejecutando newsletter semanal...');
  await sendWeeklyNewsletter();
});
```

## 🔄 Flujo de Compra Completo

```mermaid
sequenceDiagram
    participant C as Cliente
    participant F as Frontend
    participant B as Backend
    participant S as Stripe
    participant P as Printify
    participant E as Email

    C->>F: Navega productos
    F->>B: GET /api/products
    B-->>F: Lista de productos
    
    C->>F: Añade al carrito
    F->>F: Guarda en Zustand
    
    C->>F: Aplica descuento
    F->>B: POST /api/discounts/validate
    B-->>F: Descuento validado
    
    C->>F: Inicia checkout
    F->>B: POST /api/orders
    B->>S: Create Payment Intent
    S-->>B: client_secret
    B-->>F: Order + client_secret
    
    C->>F: Completa pago
    F->>S: Confirm Payment
    S->>B: POST /api/webhooks/stripe
    B->>B: Verifica signature
    
    B->>P: Create Order
    P-->>B: Order created
    
    P->>B: POST /api/webhooks/printify
    B->>B: Actualiza estado
    
    B->>E: Envía confirmación
    E-->>C: Email recibido
```

### Pasos Detallados

1. **Navegación** - Cliente explora catálogo
2. **Carrito** - Añade productos (gestión en frontend)
3. **Descuento** - Valida código promocional
4. **Orden** - Backend crea Payment Intent en Stripe
5. **Pago** - Cliente completa pago en frontend
6. **Webhook Stripe** - Confirma pago exitoso
7. **Orden Printify** - Se crea automáticamente
8. **Webhook Printify** - Actualiza estado (en producción, enviado, etc.)
9. **Email** - Confirmación al cliente

## 🔐 Seguridad

### Implementaciones de Seguridad

- ✅ **HTTPS Only** - Forzado en producción
- ✅ **CORS Configurado** - Whitelist de dominios permitidos
- ✅ **Helmet** - Headers de seguridad HTTP
- ✅ **Rate Limiting** - Máx 100 req/15min por IP
- ✅ **Webhook Signatures** - Validación HMAC de Stripe y Printify
- ✅ **Input Validation** - express-validator en todas las rutas
- ✅ **JWT Tokens** - Autenticación de administradores
- ✅ **Bcrypt** - Hashing de contraseñas (cost factor 10)
- ✅ **Environment Variables** - Secretos nunca en código
- ✅ **MongoDB Injection Protection** - Mongoose sanitization
- ✅ **XSS Protection** - Escape de HTML en inputs

### Headers de Seguridad

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Rate Limiting

```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests
  message: 'Demasiadas peticiones desde esta IP'
});
```

## 🚀 Despliegue

### Heroku

```bash
# 1. Crear app
heroku create cunao-backend

# 2. Configurar variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=mongodb+srv://...
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
heroku config:set PRINTIFY_API_TOKEN=...
heroku config:set JWT_SECRET=...

# 3. Deploy
git push heroku master

# 4. Ver logs
heroku logs --tail
```

### Railway

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Crear proyecto
railway init

# 4. Deploy
railway up
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build
docker build -t cunao-backend .

# Run
docker run -p 3000:3000 --env-file .env cunao-backend
```

### Verificación Post-Despliegue

```bash
# Health check
curl https://tu-dominio.com/api/config

# Test webhook (local)
npm run test:webhook

# Verificar cron jobs
heroku logs --tail | grep "Ejecutando"
```

## 📊 CI/CD - GitHub Actions

El proyecto utiliza **16 workflows automatizados** para garantizar calidad y fiabilidad:

### 🔄 Workflows Principales

#### **CI/CD Principal**
- **Continuous Integration** - Lint, tests, build en cada push/PR
- **Full Test Suite** - Suite completa de tests semanalmente
- **Deployment** - Deploy automático a Heroku en merge a master

#### **Seguridad**
- **Security Audit** - npm audit diario
- **Dependency Review** - Revisión en PRs
- **CodeQL Analysis** - Análisis de código estático

#### **Tests por Feature**
- **Order Tests** - Tests del sistema de pedidos
- **Discount Tests** - Tests de códigos promocionales
- **Review Tests** - Tests del sistema de reviews
- **Newsletter Tests** - Tests de suscripciones
- **Analytics Tests** - Tests de estadísticas
- **Product Tests** - Tests del catálogo
- **Webhook Tests** - Tests de integraciones

#### **Mantenimiento**
- **Weekly Cleanup** - Limpieza semanal de recursos
- **Monthly Report** - Reporte mensual de métricas
- **Backup Database** - Backup automático de MongoDB

### Configuración Ejemplo

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [ master, develop ]
  pull_request:
    branches: [ master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## 📝 Variables de Entorno Completas

### Archivo `.env` de Ejemplo

```env
# ==============================================
# SERVER CONFIGURATION
# ==============================================
PORT=3000
NODE_ENV=development

# ==============================================
# DATABASE
# ==============================================
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/cunao

# MongoDB Atlas (Producción)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cunao?retryWrites=true&w=majority

# ==============================================
# STRIPE CONFIGURATION
# ==============================================
# Test Keys (Desarrollo)
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Live Keys (Producción)
# STRIPE_SECRET_KEY=sk_live_51xxxxxxxxxxxxx
# STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# ==============================================
# PRINTIFY CONFIGURATION
# ==============================================
PRINTIFY_API_TOKEN=eyJxxxxxxxxxxxxxxxxxxxxx
PRINTIFY_SHOP_ID=1234567

# ==============================================
# CLOUDINARY (Opcional)
# ==============================================
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz

# ==============================================
# EMAIL SERVICE (Gmail)
# ==============================================
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # App Password de Google
EMAIL_FROM="Cuñadismo Ilustrado <noreply@cunaoilustrado.com>"

# ==============================================
# FRONTEND URLS
# ==============================================
# Desarrollo
FRONTEND_URL=http://localhost:5173

# Producción
# FRONTEND_URL=https://cunaoilustrado.com

# Múltiples dominios (separados por coma)
# ALLOWED_ORIGINS=http://localhost:5173,https://cunaoilustrado.com,https://www.cunaoilustrado.com

# ==============================================
# ADMIN AUTHENTICATION
# ==============================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tu_password_muy_seguro_123
JWT_SECRET=un_secret_aleatorio_muy_largo_y_complejo_abc123xyz789

# Expiración del token (opcional)
JWT_EXPIRES_IN=7d

# ==============================================
# GOOGLE ANALYTICS 4
# ==============================================
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_API_SECRET=abcdefghijklmnop1234567890

# ==============================================
# SECURITY & RATE LIMITING
# ==============================================
# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000     # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100     # 100 requests por ventana

# ==============================================
# CRON JOBS (Opcional - desactivar en dev)
# ==============================================
ENABLE_CRON_JOBS=true           # false en desarrollo
CRON_TIMEZONE=Europe/Madrid

# ==============================================
# LOGGING (Opcional)
# ==============================================
LOG_LEVEL=info                   # debug, info, warn, error
LOG_TO_FILE=false               # true en producción

# ==============================================
# OTROS (Opcional)
# ==============================================
SESSION_SECRET=otro_secret_aleatorio
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx  # Para monitoreo de errores
```

### Obtener Credenciales

#### **Stripe**
1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/)
2. Developers → API Keys
3. Copia "Secret key" y "Publishable key"
4. Para webhooks: Developers → Webhooks → Add endpoint
5. Copia "Signing secret"

#### **Printify**
1. Ve a [Printify Dashboard](https://printify.com/app/account)
2. My Account → Connections → Generate Token
3. Para Shop ID: URL de tu tienda → último número

#### **Gmail (App Password)**
1. Google Account → Security
2. 2-Step Verification → activar
3. App Passwords → Mail → Generate
4. Copia el password de 16 caracteres

#### **MongoDB Atlas**
1. Crea cluster en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Database Access → Add user
3. Network Access → Add IP (0.0.0.0/0 para acceso público)
4. Connect → Connect your application → Copia URI

#### **Cloudinary**
1. Crea cuenta en [Cloudinary](https://cloudinary.com/)
2. Dashboard → Account Details
3. Copia Cloud name, API Key, API Secret

## 🤝 Contribuir

### Flujo de Trabajo

1. **Fork** el repositorio
2. **Crea** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add: amazing feature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### Convenciones de Código

- **TypeScript** estricto - Todos los archivos `.ts`
- **ESLint** - Seguir configuración del proyecto
- **Commits semánticos**:
  - `feat:` Nueva funcionalidad
  - `fix:` Corrección de bug
  - `docs:` Documentación
  - `test:` Tests
  - `refactor:` Refactorización
  - `style:` Formato/estilo
  - `chore:` Mantenimiento

### Tests Obligatorios

- ✅ Todos los tests existentes deben pasar
- ✅ Nuevas features deben incluir tests
- ✅ Cobertura mínima: 80%
- ✅ Tests de integración para flujos críticos

```bash
# Antes de hacer PR
npm run lint
npm test
npm run build
```

## 📚 Recursos Adicionales

### Documentación de APIs

- [Stripe API Docs](https://stripe.com/docs/api)
- [Printify API Docs](https://developers.printify.com/)
- [Cloudinary API Docs](https://cloudinary.com/documentation)
- [Mongoose Docs](https://mongoosejs.com/docs/)
- [Express Docs](https://expressjs.com/)

### Tutoriales Relacionados

- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
- [Node.js Security Checklist](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### Comunidad

- **Issues**: [GitHub Issues](https://github.com/CodeInIA/cunao-backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/CodeInIA/cunao-backend/discussions)

## 🐛 Troubleshooting

### Problemas Comunes

#### **MongoDB Connection Failed**
```bash
# Verificar que MongoDB esté corriendo
mongod --version

# Probar conexión
mongosh mongodb://localhost:27017/cunao
```

#### **Stripe Webhook Not Working**
```bash
# Usar Stripe CLI para testing local
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

#### **Tests Failing**
```bash
# Limpiar cache
npm run clean
rm -rf node_modules
npm install

# Ejecutar tests individualmente
npm test -- --testPathPattern=orderController
```

#### **Port Already in Use**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo [LICENSE](LICENSE) para más detalles.

## 👥 Autores

- **CodeInIA** - *Desarrollo inicial* - [@CodeInIA](https://github.com/CodeInIA)

## 🙏 Agradecimientos

- Stripe por su excelente API y documentación
- Printify por el servicio POD automatizado
- La comunidad de Node.js y TypeScript
- Todos los contribuidores del proyecto

---

<div align="center">

### ⭐ Si este proyecto te ha sido útil, considera darle una estrella

**[⬆ Volver arriba](#-cuñadismo-ilustrado---backend)**

Hecho con ❤️ en España 🇪🇸

</div>
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
