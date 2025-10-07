# Tests de Integración del Backend

Este directorio contiene tests de integración que verifican que **TODA la tienda funciona correctamente** de principio a fin.

## 📋 ¿Qué se prueba?

### ✅ Flujo Completo de Compra (complete-purchase-flow.test.ts)

Este test verifica el ciclo completo de una compra online:

1. **Obtener Productos** - Lista de productos disponibles desde Printify
2. **Códigos de Descuento** - Creación y validación de cupones de descuento
3. **Cálculo de Totales** - Aplicación correcta de descuentos al subtotal
4. **Preparación de Datos** - Estructura correcta de line items para Stripe
5. **Base de Datos** - Guardado y recuperación de órdenes
6. **Integración con Printify** - Envío de órdenes al proveedor
7. **Procesamiento de Webhooks** - Actualización tras confirmación de pago
8. **Flujo END-TO-END** - Todo el proceso desde navegación hasta confirmación

## 🎯 Componentes Probados

### Servicios
- ✅ PrintifyService - Gestión de productos y órdenes
- ✅ StripeService - Procesamiento de pagos (mocked)
- ✅ DatabaseService - Persistencia de datos
- ✅ EmailService (indirectamente)

### Modelos
- ✅ DiscountCode - Validación y seguimiento de uso
- ✅ Order - Gestión del ciclo de vida de pedidos
- ✅ Product - Sincronización con Printify

### APIs Externas (Mocked)
- ✅ Printify API - Productos y órdenes
- ✅ Stripe API - Checkout sessions y payment intents
- ✅ MongoDB - Base de datos en memoria

## 🚀 Cómo Ejecutar

```bash
# Ejecutar solo tests de integración
npm test -- integration

# Ejecutar test específico del flujo de compra
npm test -- complete-purchase-flow

# Ejecutar con cobertura
npm test -- --coverage integration
```

## 📊 Cobertura Actual

- **9 test suites** de integración
- **Más de 99 tests** en total
- Cobertura de **todos los flujos críticos** de la tienda

## 🔍 Detalles Técnicos

### MongoDB en Memoria
Se usa `mongodb-memory-server` para crear una base de datos temporal durante los tests, evitando tocar la BD de producción.

### Nock para APIs
Se usa `nock` para interceptar y mockear las llamadas HTTP a:
- Stripe API
- Printify API

Esto permite:
- Tests más rápidos (sin esperas de red)
- Tests deterministas (sin depender de servicios externos)
- Tests offline (sin internet)

### Timeouts Extendidos
Algunos tests E2E tienen timeouts de 15 segundos para permitir:
- Conexión a MongoDB en memoria
- Múltiples operaciones asíncronas
- Validaciones de negocio complejas

## ⚠️ Importante

### NO se prueban directamente:
- ❌ Envío real de emails (solo se valida la estructura)
- ❌ Pagos reales en Stripe (se usan mocks)
- ❌ Órdenes reales en Printify (se usan mocks)
- ❌ Cloudinary (subida real de imágenes)

### SÍ se prueba la lógica de:
- ✅ Validación de datos
- ✅ Cálculos de precios y descuentos
- ✅ Flujo de estados de orden
- ✅ Interacciones entre componentes
- ✅ Integridad de datos en BD

## 🎓 Para Tests E2E Reales

Para probar con servicios reales, usa:
- **Stripe Test Mode** para pagos de prueba
- **Printify Sandbox** (si está disponible)
- **Mail traps** como Mailtrap.io para emails

## 📝 Añadir Nuevos Tests

1. Crear archivo en `src/__tests__/integration/`
2. Nombrar descriptivamente: `feature-integration.test.ts`
3. Usar `beforeAll` para setup de MongoDB
4. Usar `nock` para mockear APIs externas
5. Limpiar estado con `beforeEach`
6. Documentar el propósito del test

## 💡 Best Practices

- Mockear servicios externos (Stripe, Printify, Email)
- Usar datos de prueba realistas pero claramente falsos
- Validar tanto el path feliz como casos de error
- Limpiar base de datos entre tests
- Tests independientes (no dependen del orden)
