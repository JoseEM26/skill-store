# Design

## Context

El PRD y TECH-DESIGN especifican la integración del servidor MCP dentro del monolito Next.js mediante `@modelcontextprotocol/sdk`. En los ítems previos se implementaron el modelo de datos, la gestión de recursos (#7) y la validación de tokens de acceso con SHA-256 (#8).

## Goals / Non-Goals

**Goals:**
- Implementar el route handler `/api/mcp` en Next.js App Router usando `@modelcontextprotocol/sdk` y `SSEServerTransport` (o JSON-RPC sobre HTTP).
- Registrar herramientas de lectura pública (`list_skills`, `search_skills`, `get_skill`, `get_version`, `check_updates`, `list_contexts`, `get_context`).
- Implementar la herramienta autenticada `get_my_setup`, que consolida en un único payload JSON todas las skills y contextos (ideas privadas y referencias) del usuario del token.
- Validar argumentos de entrada en cada tool con Zod.
- Extraer y verificar tokens de acceso mediante `validateAccessToken` con scope `read`.

**Non-Goals:**
- Herramientas de escritura MCP (`create_context`, `publish_skill`, etc. - corresponden a #10).
- Mecanismos de streaming bidireccional complejo fuera del protocolo MCP estándar.

## Decisions

### 1. Integración de `@modelcontextprotocol/sdk` en Next.js Route Handler
- **Decisión**: Montar el servidor MCP en `app/api/mcp/route.ts` con manejo de peticiones GET (para handshake SSE) y POST (para recepción de mensajes/invocación de tools).
- **Razón**: Alineado con ADR-0001 y ADR-0002, manteniendo un único monolito y evitando operar servicios independientes.

### 2. Autenticación desacoplada por tool
- **Decisión**: Para tools públicas (`list_skills`, `search_skills`, etc.), el token es opcional. Si se envía en cabecera `Authorization: Bearer <token>` o como argumento opcional, se valida con `validateAccessToken(token, 'read')` para desbloquear recursos privados asociados. Para `get_my_setup`, la presencia de un token válido con scope `read` es obligatoria.
- **Razón**: Respeta la regla transversal: lectura de catálogo público abierta a todos, datos privados y setup personal restringidos al dueño.

### 3. Payload optimizado para `get_my_setup`
- **Decisión**: Ejecutar consultas Prisma paralelas (`prisma.skill.findMany` y `prisma.context.findMany`) filtradas por `ownerId`, devolviendo un objeto estructurado:
  ```json
  {
    "user": { "username": "..." },
    "skills": [...],
    "contexts": {
      "ideas": [...],
      "externalReferences": [...]
    }
  }
  ```
- **Razón**: Diseñado específicamente para que Claude Code consuma todo el contexto en un único turno de ejecución al iniciar una sesión.

### 4. Schemas de entrada Zod compartidos
- **Decisión**: Cada tool MCP declara sus parámetros mediante esquemas Zod reutilizados de `lib/validations/*`.

## Risks / Trade-offs

- **[Duración de conexión SSE en funciones serverless]** → Mitigación: En desarrollo local (Docker Postgres) no existe limitación. Si en producción surge restricción de timeout, ADR-0002 documenta la migración aislada de este handler a un contenedor Node sin reescribir lógica.
