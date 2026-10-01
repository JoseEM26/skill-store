# Tasks

## 1. Configuración de dependencias y variables de entorno

- [x] 1.1 Instalar dependencias de NextAuth / Auth.js (`next-auth`) y verificar que `pnpm build` o typecheck compile correctamente
- [x] 1.2 Definir variables de entorno en `.env.example` (`GITHUB_ID`, `GITHUB_SECRET`, `AUTH_SECRET`, `AUTH_SESSION_MAX_AGE`) y agregar validación Zod en configuración de entorno

## 2. Configuración de Auth.js y sincronización con PostgreSQL

- [x] 2.1 Configurar el route handler de autenticación (`app/api/auth/[...nextauth]/route.ts`) con proveedor GitHub OAuth y estrategia JWT
- [x] 2.2 Implementar callback de persistencia/upsert en la tabla `User` de Prisma (`githubId`, `username`, `avatarUrl`) e inyectar `user.id` en el JWT
- [x] 2.3 Escribir tests unitarios para la sincronización de usuario en PostgreSQL y la generación/verificación del token JWT con expiración configurable

## 3. Middleware y protección de rutas administrativas

- [x] 3.1 Implementar `middleware.ts` en Next.js con matcher `/admin/:path*` que valide la presencia del JWT y redirija a login conservando `callbackUrl`
- [x] 3.2 Crear vista base protegida `/admin` (Server Component) que lea la sesión actual, muestre la información del usuario autenticado y un botón para cerrar sesión
- [x] 3.3 Implementar tests de integración para el middleware y flujo de autenticación verificando redirección en peticiones no autenticadas y acceso concedido con sesión válida

## 4. Verificación integral

- [x] 4.1 Ejecutar la suite completa de tests con `pnpm test` y verificar que todas las pruebas pasen sin errores
