# Proposal

## Why

Para que los agentes de IA (como Claude Code) y clientes externos puedan consumir el servidor MCP e interactuar con los recursos del usuario de forma segura y autorizada, el sistema requiere un mecanismo de emisión y gestión de tokens de acceso personal con scopes granulares (`read`, `write`, `delete`). Los tokens deben almacenarse protegidos mediante hash rápido (SHA-256, ADR-0010) y permitir revocación inmediata desde el panel administrativo.

## What Changes

- Vista y componentes en el panel administrativo (`/admin/tokens`) para gestionar tokens personales.
- Generación de secretos aleatorios de alta entropía (Personal Access Tokens), mostrados en texto plano exactamente una vez al usuario al momento de su creación.
- Persistencia del hash SHA-256 en la tabla `AccessToken` en Postgres con metadata asociada: `ownerId`, `scopes` (`read`, `write`, `delete`), `label`, `expiresAt`, `createdAt`.
- Revocación inmediata marcando `revokedAt = now()` mediante Server Action en el panel admin.
- Capa de servicio (`lib/auth/tokens.ts`) para autenticar tokens entrantes comparando el hash SHA-256 con índice único en Postgres, validando que no esté expirado ni revocado, y actualizando `lastUsedAt`.

## Capabilities

### New Capabilities
- `tokens-mcp`: Emisión, visualización única, almacenamiento con hash SHA-256, revocación inmediata y validación de tokens de acceso personal con scopes granulares (`read`, `write`, `delete`) asociados a un dueño.

### Modified Capabilities
<!-- No se modifican los requerimientos del modelo de datos base ya existente en data-model. -->

## Impact

- **UI / Frontend**: Nueva sección `/admin/tokens` con listado de tokens activos/revocados, formulario de emisión con selección de scopes/expiración y modal de revelación única del token generado.
- **Backend / Seguridad**: Módulo de generación de tokens (`crypto.randomBytes`), cálculo de hash SHA-256 y validación de tokens contra la base de datos PostgreSQL local.
