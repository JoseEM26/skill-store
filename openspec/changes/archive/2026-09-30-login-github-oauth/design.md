# Design

## Context

El proyecto es un monolito Next.js (App Router) con TypeScript y PostgreSQL local (vía Docker, puerto 5433). El modelo `User` ya está implementado en Prisma (`id`, `githubId`, `username`, `avatarUrl`, `createdAt`). Para la gestión administrativa, se requiere autenticación con identidad proveniente de GitHub sin mantener contraseñas en la base de datos.

## Goals / Non-Goals

**Goals:**
- Configurar Auth.js (NextAuth) con proveedor GitHub OAuth y estrategia de sesión JWT.
- Sincronizar automáticamente el usuario de GitHub en la tabla `User` de Postgres en cada login.
- Inyectar el `id` interno del usuario en el token JWT para que los Server Components y Server Actions conozcan la identidad del usuario sin consultar la base de datos en cada middleware.
- Proteger rutas `/admin/*` mediante middleware de Next.js.
- Permitir configuración de expiración de sesión mediante variable de entorno.

**Non-Goals:**
- Formularios o endpoints de escritura para skills o contextos (corresponde a #7).
- Generación o validación de tokens de acceso MCP (corresponde a #8).
- Sistema de roles jerárquicos o permisos de equipo.

## Decisions

### 1. Estrategia de sesión JWT en Auth.js / NextAuth
- **Decisión**: Usar estrategia `session: { strategy: "jwt" }`.
- **Razón**: Permite validar la sesión en Edge Middleware y Server Components sin golpear Postgres en cada navegación de página.
- **Alternativa descartada**: Sesiones basadas en base de datos (`strategy: "database"`), que agregaría lecturas obligatorias a Postgres en cada request HTTP.

### 2. Sincronización de identidad en callbacks de Auth
- **Decisión**: En el callback `signIn` o `jwt`, realizar un upsert en la tabla `User` utilizando `githubId`. El `id` (UUID/cuid) generado en Postgres se almacena en el payload del JWT como `sub` o `userId`.
- **Razón**: Garantiza que cualquier operación posterior (creación de ideas, tokens, skills) tenga una clave foránea válida `ownerId -> User.id`.

### 3. Middleware de Next.js para rutas administrativas
- **Decisión**: Middleware configurado con `matcher: ["/admin/:path*"]` que verifica la presencia y validez del JWT.
- **Razón**: Protección centralizada en el borde de la aplicación; redirige automáticamente al flujo de login de GitHub preservando la URL solicitada (`callbackUrl`).

### 4. Configuración de expiración de sesión
- **Decisión**: Exponer `AUTH_SESSION_MAX_AGE` (en segundos) con un valor por defecto (ej. 30 días: 2592000s).

## Risks / Trade-offs

- **[Inconsistencia de username/avatar en GitHub]** → Mitigación: Cada inicio de sesión actualiza `username` y `avatarUrl` en la tabla `User`, manteniendo el `id` inmutable.
- **[Variables de entorno requeridas en desarrollo local]** → Mitigación: Documentar en `.env.example` las claves `GITHUB_ID`, `GITHUB_SECRET`, `AUTH_SECRET`, y proveer instrucciones claras para registrar una OAuth App en GitHub con callback local (`http://localhost:3000/api/auth/callback/github`).
