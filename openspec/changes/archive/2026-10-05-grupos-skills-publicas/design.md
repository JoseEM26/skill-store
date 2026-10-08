# Design

## Context

Ver `proposal.md` y la revisión 2026-10-05 de ADR-0015. `addSkillToGroup` hoy exige
`skill.ownerId === ownerId`; `get_group` (MCP) ya filtra por visibilidad (`isPublic && !isPaused`)
`|| ownerId === callerId` — ese mismo criterio es el que se traslada acá al momento de agregar.

## Decision

- `addSkillToGroup`: reemplazar el `findFirst({ where: { id: skillId, ownerId } })` por
  `findFirst({ where: { id: skillId, OR: [{ ownerId }, { isPublic: true, isPaused: false }] } })`.
  La skill también debe no estar archivada (`isArchived: false`) para poder agregarse, mismo
  criterio que el resto del catálogo.
- Panel: `/admin/groups/page.tsx` trae además `getPublicCatalog({ type: 'skills' })` y lo pasa al
  picker junto con `getUserSkills`, deduplicando por `id` (una skill propia no debería aparecer
  dos veces si también es pública).

## Non-Goals

- No se toca `get_group` (MCP) — ya tenía el criterio correcto.
- No se agrega gestión de grupos vía MCP (sigue siendo solo panel, ADR-0015 original).
