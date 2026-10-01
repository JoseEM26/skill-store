# Proposal

## Why
Distintos desarrolladores y organizaciones pueden crear y publicar skills con el mismo nombre común (ej. `git-tools` o `react-helpers`). El registro debe evitar colisiones de rutas y prevenir sobrescrituras destructivas entre dueños distintos, garantizando que cada skill sea direccionable unívocamente bajo el espacio de nombres de su creador (`{owner}/{slug}`).

## What Changes
- Estandarización de rutas REST y páginas web bajo la estructura de espacio de nombres `{owner}/{slug}` (ej. `/api/skills/{owner}/{slug}` y `/skills/{owner}/{slug}`) conforme a ADR-0004.
- Validación estricta en el flujo de publicación e ingesta (web, CI/CD y MCP) para rechazar duplicados de `slug` pertenecientes al mismo dueño, mientras se permite la coexistencia del mismo `slug` bajo distintos dueños.
- Búsqueda y visualización en el catálogo público y MCP que presentan e identifican de forma explícita la atribución `{owner}/{slug}` para evitar confusiones de identidad.

## Capabilities

### New Capabilities
<!-- Ninguna capability nueva -->

### Modified Capabilities
- `data-model`: Refuerza los requisitos de direccionamiento y resolución unívoca de skills mediante la tupla `{owner}/{slug}`, garantizando que las consultas y operaciones identifiquen al dueño sin ambigüedad.

## Impact
- **API REST**: Todos los endpoints de detalle, versiones y descargas utilizan `{owner}/{slug}` (ej. `/api/skills/[owner]/[slug]`).
- **Frontend / Rutas**: Creación de rutas App Router anidadas `/skills/[owner]/[slug]`.
- **Servidor MCP**: Las tools de obtención e instalación aceptan `owner` y `slug` (o string compuesto `owner/slug`).
- **Base de Datos**: Consistencia con el índice único compuesto `@@unique([ownerId, slug])` ya definido en Prisma.
