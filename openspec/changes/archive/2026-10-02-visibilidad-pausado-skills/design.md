# Design

## Context

Ver `proposal.md` y ADR-0011 (`adrs/0011-visibilidad-y-pausado-de-skills.md`) para la decisión
completa ya cerrada. El modelo `Skill` ya tiene `isArchived` (ítem #13); este change agrega dos
campos nuevos con semántica independiente.

## Goals / Non-Goals

**Goals:**
- `isPublic` (default `true`) e `isPaused` (default `false`) en `Skill`, migrados sin romper filas
  existentes.
- Mismo control y mismas reglas de propiedad desde panel web y MCP — ninguno más permisivo.
- Catálogo público y tools MCP de lectura filtran ambos campos igual que ya filtran `isArchived`.
- Advertencia de borrado con texto condicional según `isPublic`.

**Non-Goals:**
- Modelo de licencia por skill (sigue abierto, ver PRD.md → Historial de cambios) — no se resuelve
  en este change.
- Migrar o actualizar el `repository` de las 13 skills de ejemplo (ADR-0012) — change separado.

## Decisions

### 1. Dos booleanos independientes, no un enum de estado
- **Decisión:** `isPublic: Boolean @default(true)` e `isPaused: Boolean @default(false)` como
  columnas separadas.
- **Razón:** ya está decidido en ADR-0011 — un enum único mezclaría dos ejes independientes
  (visibilidad y disponibilidad temporal) y obligaría a reescribir los filtros `isArchived: false`
  ya probados en los ítems #5, #9, #11 y #13.

### 2. Filtro consistente en cuatro lugares
- **Decisión:** `src/lib/catalog/queries.ts`, `handleListSkills`/`handleSearchSkills`/
  `handleGetSkill` en `src/lib/mcp/tools.ts` agregan `isPublic: true, isPaused: false` a su
  `where`, igual patrón que el filtro existente de `isArchived: false` — salvo que la consulta la
  haga el propio dueño (se resuelve el `ownerId` del token/sesión y se agrega un `OR` como ya hace
  `handleListContexts` para `Context`).
- **Razón:** reutiliza exactamente el patrón ya implementado y verificado para `Context` en el
  ítem #9 — no se inventa un mecanismo nuevo.

### 3. Texto de advertencia de borrado condicional en el cliente
- **Decisión:** el modal de confirmación de borrado en `SkillList.tsx` lee el `isPublic` de la
  skill y muestra uno de los dos textos definidos en ADR-0011, antes de llamar a la Server Action
  de borrado existente (`deleteUserSkill`, sin cambios en su lógica).
- **Razón:** es una decisión de presentación, no de autorización — la lógica de borrado en sí no
  cambia.

## Risks / Trade-offs

- [Las 13 skills de ejemplo quedan con `isPublic: true` por default — no se marca ninguna como
  privada/pausada automáticamente] → Aceptado, es el comportamiento correcto para no cambiar nada
  de lo ya publicado; si se quiere probar el caso privado/pausado hay que marcarlo manualmente.
