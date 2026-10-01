# Proposal

## Why

Para permitir que los dueños de skills, ideas y contextos administren sus recursos y emitan tokens en fases posteriores, el sistema requiere un mecanismo de autenticación confiable y sin fricción. Siguiendo la arquitectura definida (PRD y TECH-DESIGN), la identidad se basa exclusivamente en GitHub OAuth con sesiones JWT firmadas y sin contraseñas locales.

## What Changes

- Integración de autenticación mediante GitHub OAuth usando Auth.js / NextAuth en el monolito Next.js.
- Persistencia y sincronización automática del perfil de usuario (`githubId`, `username`, `avatarUrl`) en la tabla `User` de Postgres en el primer inicio de sesión o login recurrente.
- Emisión y verificación de JWT de sesión firmado con tiempo de expiración configurable vía variables de entorno.
- Protección de rutas administrativas (`/admin` y subrutas) mediante middleware/guards de Next.js, redirigiendo a login cuando la sesión no existe o el JWT ha expirado.
- Endpoint o handler de sesión para verificar el estado de autenticación y datos del usuario actual.
- Cierre de sesión (logout) que invalida la sesión activa en el cliente.
- **Sin escritura de recursos todavía**: este cambio habilita exclusivamente la identidad y la sesión autenticada; la gestión y escritura de ideas/skills/tokens pertenece a los ítems subsiguientes del backlog.

## Capabilities

### New Capabilities
- `autenticacion`: Flujo de inicio de sesión con GitHub OAuth, persistencia/upsert de usuario en Postgres, manejo de sesiones basadas en JWT firmado con expiración configurable y protección de rutas del panel administrativo.

### Modified Capabilities
<!-- No se modifican los requerimientos del modelo de datos base ya existente en data-model. -->

## Impact

- **Dependencias**: Adición de `next-auth` (o Auth.js para Next.js App Router).
- **Rutas y middleware**: Configuración de `api/auth/[...nextauth]` route handler y middleware de Next.js para interceptar rutas bajo `/admin/*`.
- **Base de datos**: Consultas/upsert sobre el modelo `User` en la base Postgres local (`docker-compose`, puerto 5433).
- **Variables de entorno**: `GITHUB_ID`, `GITHUB_SECRET`, `AUTH_SECRET` (o `NEXTAUTH_SECRET`), y configuración de tiempo de expiración de sesión.
