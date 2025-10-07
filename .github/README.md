# GitHub Actions Workflows - Cuñadismo Ilustrado Backend

[![CI](https://github.com/CodeInIA/cunao-backend/workflows/Backend%20CI/badge.svg)](https://github.com/CodeInIA/cunao-backend/actions)
[![Security](https://github.com/CodeInIA/cunao-backend/workflows/Security%20&%20Middleware/badge.svg)](https://github.com/CodeInIA/cunao-backend/actions)

## 🎯 Descripción

Este repositorio incluye workflows automatizados de GitHub Actions para testing, validación y deployment del backend de Cuñadismo Ilustrado.

## 📦 Workflows Disponibles

### CI/CD Principal

| Workflow | Descripción | Trigger |
|----------|-------------|---------|
| **ci.yml** | Build y tests en Node 18.x y 20.x | Push/PR |
| **full-suite.yml** | Suite completa de integración | Push a master, Semanal |
| **deployment.yml** | Validación de deployment | Push/PR a master |
| **security.yml** | Auditoría de seguridad | Cambios en middleware |

### Funcionalidades

| Workflow | Funcionalidad Probada |
|----------|----------------------|
| **orders.yml** | Pedidos, Stripe, Printify |
| **products.yml** | Catálogo y productos |
| **discounts.yml** | Códigos de descuento |
| **reviews.yml** | Sistema de reseñas |
| **newsletter.yml** | Email marketing |
| **admin.yml** | Autenticación y panel admin |
| **analytics.yml** | Reportes y estadísticas |
| **images.yml** | Gestión de imágenes |
| **webhooks.yml** | Integraciones externas |
| **contact.yml** | Formulario de contacto |
| **cron-jobs.yml** | Tareas programadas |
| **database.yml** | Modelos y DB |

## ✅ Sin Configuración de Secretos Necesaria

Los workflows están configurados con **valores fake** que tienen la sintaxis correcta para que el código compile, pero **no hacen llamadas reales** a servicios externos.

### Variables de Entorno Incluidas

Todos los workflows ya incluyen valores de prueba hardcodeados:
- ✅ `STRIPE_SECRET_KEY` → `sk_test_fake_key_for_workflow_compilation_only`
- ✅ `PRINTIFY_API_TOKEN` → `fake_printify_token_12345678901234567890`
- ✅ `CLOUDINARY_API_SECRET` → `fake_cloudinary_secret_abcdef123456`
- ✅ `JWT_SECRET` → `fake_jwt_secret_key_for_testing_workflow_only_12345`
- ✅ `EMAIL_USER` → `test@example.com`
- ✅ `MONGODB_URI` → `mongodb://localhost:27017/test-db`

**No necesitas configurar ningún secret en GitHub** ✨

### ⚠️ Importante

Estos valores fake son **solo para validación de sintaxis**. Los workflows:
- ✅ Verifican que el código TypeScript compile
- ✅ Ejecutan tests unitarios
- ✅ Validan la estructura del código
- ❌ **NO hacen llamadas reales** a Stripe, Printify, Cloudinary, etc.

## 🚀 Uso

### Ejecución Automática

Los workflows se ejecutan automáticamente cuando:
- Haces push a `master` o `develop`
- Creas un Pull Request
- Modificas archivos relevantes (path filters)
- Según programación (cron jobs)

### Ejecución Manual

1. Ve a la pestaña **Actions**
2. Selecciona el workflow
3. Click en **Run workflow**
4. Selecciona la branch
5. Click en **Run workflow**

## 📊 Resultados

### Ver Resultados
- **Actions tab**: Todos los workflows ejecutados
- **Pull Requests**: Checks automáticos
- **Artifacts**: Descarga reportes y builds

### Artifacts Generados
- ✅ Build outputs (7 días)
- ✅ Test results (7 días)
- ✅ Coverage reports (30 días)
- ✅ Security audits (30 días)

## 🔧 Desarrollo Local

### Ejecutar Tests

```bash
npm install
npm test
npm run build
```

### Simular Workflows

Usa [act](https://github.com/nektos/act):

```powershell
# Instalar act (Windows)
choco install act-cli

# Ejecutar workflow
act -W .github/workflows/ci.yml

# Con secretos
act -s MONGODB_URI=mongodb://localhost:27017/test
```

## 📅 Programación

| Workflow | Frecuencia | Hora (UTC) |
|----------|-----------|-----------|
| cron-jobs.yml | Diario | 2:00 AM |
| full-suite.yml | Semanal (Domingos) | 3:00 AM |

## 🐛 Troubleshooting

### Workflow no se ejecuta
- Verifica que los archivos modificados coincidan con los path filters
- Revisa la sintaxis del archivo YAML
- Comprueba que la branch sea correcta

### Tests fallan en CI
- Verifica la versión de Node.js
- Revisa la sintaxis de TypeScript
- Comprueba que las dependencias estén en package.json

### MongoDB no inicia
Si el workflow falla al conectar a MongoDB, verifica que el service container esté configurado correctamente en el workflow.

## 📚 Más Información

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)

## 🤝 Contribuir

1. Crea un nuevo archivo en `.github/workflows/`
2. Usa la estructura de workflows existentes
3. Añade documentación
4. Prueba localmente con `act`
5. Crea un Pull Request

---

**Nota**: Los workflows están optimizados para ejecutarse solo cuando hay cambios relevantes, ahorrando recursos de GitHub Actions.
