# Design

## Context

Ver `proposal.md` y ADR-0015 (`adrs/0015-grupos-de-skills.md`) para la decisión completa ya
cerrada. Reusa el patrón de ownership ya establecido en `src/lib/admin/skills.ts` y el patrón de
filtros de visibilidad ya implementado en `handleGetSkill` (ítem #16).

## Goals / Non-Goals

**Goals:**
- `SkillGroup`/`SkillGroupItem` (muchos-a-muchos).
- CRUD de grupos solo desde el panel.
- `list_groups`/`get_group` de solo lectura vía MCP.
- `pull-group` en el CLI + opción de grupo en `tui`.

**Non-Goals:**
- Creación/edición de grupos vía MCP — explícitamente excluido por pedido del usuario.
- Grupos públicos/compartibles entre usuarios — por ahora un grupo es siempre privado a su dueño,
  visible solo para él (no hay concepto de "grupo público" en esta versión).
- Reordenar manualmente las skills dentro de un grupo — el orden de listado es por `addedAt`, no
  hace falta más para esta versión.

## Decisions

### 1. Tabla de unión explícita, no array de IDs
- **Decisión:** `SkillGroupItem` como modelo Prisma propio (`groupId`, `skillId`, `addedAt`,
  `@@unique([groupId, skillId])`).
- **Razón:** una relación muchos-a-muchos real en Postgres vía tabla de unión es el patrón estándar
  de Prisma; un array de IDs en `SkillGroup` sería más frágil (sin integridad referencial, sin
  poder usar `include` de Prisma de forma natural).

### 2. `get_group` omite skills no visibles, no falla toda la consulta
- **Decisión:** al armar la respuesta de `get_group`, cada skill del grupo pasa por el mismo
  criterio de visibilidad que ya usa `handleGetSkill` (`isPublic && !isPaused`, o `ownerId` del
  token coincide); las que no pasan se excluyen del array de resultado, sin lanzar error.
- **Razón:** un grupo no debería romperse completo porque una sola skill cambió de estado — ya
  decidido así en el ADR.

### 3. Grupos sin gestión vía MCP — solo panel
- **Decisión:** no se agrega `create_group`/`update_group`/`delete_group` como tools MCP en esta
  versión.
- **Razón:** pedido explícito del usuario ("esos grupos que lo pueda hacer a través de la
  plataforma web"). Si más adelante se quiere gestión vía MCP, es un ADR/change aparte.

### 4. `pull-group` reusa `handlePull` por cada skill, no una ruta nueva de escritura en disco
- **Decisión:** `pull-group` llama `get_group` vía MCP, y por cada skill del resultado invoca la
  misma función `handlePull` (o su lógica interna de escritura de `files`) ya usada por `pull`
  individual.
- **Razón:** cero duplicación de la lógica de escritura a disco; el único código nuevo es "traer
  la lista de skills del grupo" y "iterar".

## Risks / Trade-offs

- [`tui` depende de que las tools MCP de grupos (Grupo 3 de tasks.md) ya existan antes de poder
  integrarlas] → Aceptado; por eso la tarea de integración en `tui` va después, no en paralelo con
  el resto.
- [Grupos vacíos (sin skills) son válidos] → Aceptado, un grupo recién creado empieza vacío; no es
  un estado de error.
