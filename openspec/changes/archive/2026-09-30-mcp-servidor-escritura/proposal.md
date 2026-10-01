# Proposal

## Why

Para que los agentes de IA (como Claude Code) puedan capturar ideas sobre la marcha, registrar referencias de contexto externas y publicar o gestionar skills sin abandonar la terminal, el servidor MCP debe incorporar herramientas de mutación de datos. Estas herramientas deben aplicar estrictamente la regla de seguridad transversal de 3 condiciones: token válido + scope adecuado (`write` o `delete`) + verificación de que el recurso pertenezca al dueño del token.

## What Changes

- Registro de herramientas MCP de escritura en el servidor MCP:
  - `create_context`: crea una idea privada (`isPublic: false` por defecto) o referencia externa (`isPublic: true`) asignándole el `ownerId` del token (requiere scope `write`).
  - `update_context`: actualiza el contenido o visibilidad de un contexto existente, validando que pertenezca al usuario del token (requiere scope `write`).
  - `delete_context`: elimina o archiva un contexto del usuario, exigiendo explícitamente el scope `delete`.
  - `publish_skill`: registra o actualiza metadata/versión de una skill asignada al dueño del token (requiere scope `write`).
  - `delete_skill`: archiva o elimina una skill perteneciente al dueño del token, exigiendo el scope `delete`.
- Validación de autorización de 3 condiciones: token activo no expirado/revocado, scope requerido presente y coincidencia estricta de `ownerId`.
- Rechazo inmediato (403) si un token con scope `write` intenta llamar una herramienta que exige `delete`, o si se intenta alterar un recurso perteneciente a otro usuario.

## Capabilities

### New Capabilities
- `servidor-mcp-escritura`: Herramientas MCP de creación, edición y eliminación de contextos y skills protegidas por permisos granulares por scope (`write`/`delete`) y propiedad de recursos.

### Modified Capabilities
<!-- No se modifican los requerimientos del modelo de datos base ya existente en data-model. -->

## Impact

- **Servidor MCP**: Registro de nuevos tool handlers en `lib/mcp/server.ts` y route handler `/api/mcp`.
- **Seguridad**: Integración profunda con `validateAccessToken` exigiendo scopes específicos (`write` para creación/edición, `delete` para eliminación) y validación de `ownerId`.
