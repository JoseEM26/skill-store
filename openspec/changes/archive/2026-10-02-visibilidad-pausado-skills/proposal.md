# Proposal

## Why

Hoy toda skill publicada es siempre pública y solo puede terminar oculta del catálogo activo de
forma irreversible (archivado automático al borrar la cuenta, ítem #13). El dueño de una skill
necesita los mismos dos controles que ya tiene sobre sus ideas: decidir si es pública o privada, y
poder ocultarla/pausarla temporalmente sin perderla ni borrarla — reversible por él mismo en
cualquier momento. Esta decisión ya está cerrada en ADR-0011; este change la implementa.

## What Changes

- Agregar `isPublic` (default `true`) e `isPaused` (default `false`) al modelo `Skill`.
- Panel admin y tools MCP (`publish_skill`, `update_skill`) exponen el mismo control de
  visibilidad/pausado, con la misma semántica de propiedad (`ownerId === token/session.userId`) ya
  usada en el resto del proyecto.
- El catálogo público y las tools MCP de lectura (`list_skills`, `search_skills`, `get_skill`)
  excluyen skills con `isPublic: false` o `isPaused: true`, salvo que la consulta la haga el propio
  dueño (panel, o MCP con token válido del dueño).
- Al confirmar el borrado definitivo de una skill, mostrar una advertencia cuyo texto depende de
  `isPublic` en ese momento (ver ADR-0011 para el texto exacto de cada caso).

## Capabilities

### Modified Capabilities

- `data-model`: agrega `isPublic`/`isPaused` a `Skill` y sus invariantes (ver ADR-0011).
- `panel-admin`: el dueño puede alternar visibilidad/pausado de sus propias skills.
- `servidor-mcp-escritura`: `publish_skill`/`update_skill` aceptan y respetan los mismos campos.
- `servidor-mcp-lectura`: `list_skills`/`search_skills`/`get_skill` filtran por `isPublic`/`isPaused`
  salvo que el token pertenezca al dueño.
- `public-catalog`: el catálogo web filtra igual que las tools de lectura del MCP.

## Impact

- **Base de datos**: migración de Prisma (dos columnas nuevas con default, no rompe filas
  existentes).
- **Backend**: `src/lib/admin/skills.ts` (panel), `src/lib/mcp/tools.ts` (MCP lectura/escritura),
  `src/lib/catalog/queries.ts` (catálogo público).
- **Frontend**: `src/components/admin/SkillList.tsx` (toggles de visibilidad/pausado, modal de
  confirmación de borrado con el texto condicional).
