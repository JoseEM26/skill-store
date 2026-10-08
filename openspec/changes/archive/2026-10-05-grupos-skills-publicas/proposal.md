# Proposal

## Why

Un usuario recién logueado todavía no publicó ninguna skill propia (las 13 de ejemplo pertenecen
a `Aybar-Corp`, no al usuario real). Con la regla actual ("solo skills propias"), el selector de
`/admin/groups` queda vacío y la función de grupos es inutilizable para el caso real: armar una
colección personal con skills de la comunidad para traerlas juntas después.

## What Changes

- `addSkillToGroup` deja de exigir que la skill sea del mismo dueño que el grupo. Pasa a aceptar
  la skill si es del dueño del grupo (incluida privada/pausada propia) **o** si es pública y no
  pausada — mismo criterio que ya usa `get_group` (MCP) para decidir qué mostrar.
- El selector de skills en `/admin/groups` muestra, además de las propias, el catálogo público
  (`getPublicCatalog`), para poder agregar skills de otros dueños al grupo.
- La propiedad del grupo en sí no cambia — sigue siendo exclusiva de quien lo creó.

## Capabilities

### Modified Capabilities
- `skill-groups` — relaja de qué dueño puede ser una skill agregada a un grupo propio.

## Impact

- `src/lib/admin/groups.ts` (`addSkillToGroup`) — nuevo criterio de validación.
- `src/app/admin/groups/page.tsx` — trae también `getPublicCatalog()` para el selector.
- `src/components/admin/GroupList.tsx` — selector de skills ahora distingue "mis skills" vs
  "catálogo público" (o los une en una sola lista con indicador de dueño).
- Sin impacto en MCP (`get_group` ya aplicaba este criterio) ni en el CLI.
