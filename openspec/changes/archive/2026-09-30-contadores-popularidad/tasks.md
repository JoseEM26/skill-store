# Tasks

## 1. Backend: Servicios y Endpoints de Incremento

- [x] 1.1 Crear funciones de servicio con Prisma para incrementar atómicamente `downloadsCount` e `installsCount` de una skill por `owner` y `slug`, y verificar con tests unitarios en Vitest.
- [x] 1.2 Implementar los route handlers REST públicos `POST /api/skills/[owner]/[slug]/download` y `POST /api/skills/[owner]/[slug]/install` (sin autenticación requerida conforme a ADR-0009), y verificar mediante tests de integración HTTP de respuesta 200 y 404 ante skills no encontradas.

## 2. Frontend: UI y Acciones de Descarga

- [x] 2.1 Actualizar los Server Components de catálogo (card de skill) y página de detalle para renderizar los valores de `downloadsCount` e `installsCount`, verificando su renderizado correcto.
- [x] 2.2 Conectar el botón "Descargar" en la vista de detalle de la skill para disparar la Server Action / endpoint de incremento al descargar, y verificar en base de datos local que el contador suba exactamente en 1.

## 3. Servidor MCP: Conteo de Instalaciones

- [x] 3.1 Integrar el incremento de `installsCount` en el flujo de ejecución de la herramienta MCP de instalación/obtención de skill, y verificar mediante test automatizado del handler MCP.
