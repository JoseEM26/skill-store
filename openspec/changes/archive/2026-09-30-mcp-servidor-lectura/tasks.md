# Tasks

## 1. Setup del servidor MCP y Route Handler

- [x] 1.1 Instalar dependencia `@modelcontextprotocol/sdk` y configurar la inicialización del servidor MCP en `lib/mcp/server.ts`
- [x] 1.2 Implementar el route handler `app/api/mcp/route.ts` para gestionar conexiones SSE y peticiones HTTP de mensajes MCP
- [x] 1.3 Implementar helper de extracción y verificación de token de cabecera `Authorization` conectándolo con `validateAccessToken`

## 2. Herramientas de lectura pública del catálogo

- [x] 2.1 Implementar tools MCP `list_skills`, `search_skills`, `get_skill`, `get_version` y `check_updates` con esquemas Zod y consultas a Prisma
- [x] 2.2 Implementar tools MCP `list_contexts` y `get_context` garantizando que las ideas privadas solo se incluyan si el token presentado coincide con el dueño
- [x] 2.3 Escribir tests unitarios para las tools de lectura verificando formatos de salida y filtrado de recursos privados en consultas no autenticadas

## 3. Herramienta de setup personalizado (`get_my_setup`)

- [x] 3.1 Implementar la tool `get_my_setup` que exija token con scope `read` y consolide en un solo objeto JSON todas las skills y contextos pertenecientes a ese usuario
- [x] 3.2 Escribir tests automatizados para `get_my_setup` cubriendo: rechazo sin token (401), rechazo con scope insuficiente o token revocado, y respuesta completa con token válido

## 4. Verificación integral

- [x] 4.1 Ejecutar la suite completa de tests (`pnpm test`) verificando que todas las herramientas del servidor MCP de lectura funcionen conforme a la especificación
