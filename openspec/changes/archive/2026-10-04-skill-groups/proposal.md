# Proposal

## Why

El usuario quiere armar, desde el panel web, grupos nombrados de skills propias, y después traer
el grupo entero de una sola vez desde cualquier otro proyecto (CLI/`tui`), en vez de traer skills
una por una.

## What Changes

- Nuevo modelo `SkillGroup` (`id`, `name`, `ownerId`, timestamps) y tabla de unión
  `SkillGroupItem` (`groupId`, `skillId`, `addedAt`) — relación muchos-a-muchos.
- Panel web: CRUD de grupos propios (crear/renombrar/borrar grupo, agregar/quitar skills de un
  grupo) en `/admin`. Sin gestión de grupos vía MCP (explícitamente, por pedido del usuario).
- MCP: nuevas tools de solo lectura `list_groups` y `get_group`, aplicando los mismos filtros de
  propiedad/visibilidad ya usados por `get_skill` (una skill del grupo que ya no es visible se
  omite, no rompe el resto).
- CLI: nuevo comando `pull-group <nombre>` que trae todas las skills de un grupo de una vez.
- `tui`: nueva opción para elegir un grupo guardado y traerlo completo.

## Capabilities

### New Capabilities
- `skill-groups` — CRUD de grupos desde el panel, lectura vía MCP, traída completa vía CLI.

### Modified Capabilities
- `data-model` — nuevos modelos `SkillGroup`/`SkillGroupItem`.
- `cli-instalacion` — nuevo comando `pull-group` y opción de grupo en `tui`.

## Impact

- `prisma/schema.prisma` — migración nueva (`SkillGroup`, `SkillGroupItem`).
- Nuevo `src/lib/admin/groups.ts` (CRUD, ownership-aware, mismo patrón que `src/lib/admin/skills.ts`).
- Nueva UI en `/admin` (componente de gestión de grupos).
- `src/lib/mcp/tools.ts` — nuevas `handleListGroups`/`handleGetGroup`.
- `src/app/api/mcp/route.ts` — nuevas entradas en `AVAILABLE_TOOLS` y el switch de dispatch.
- `src/lib/cli/commands.ts`, `bin/skills-cli.ts` — nuevo comando `pull-group`.
- `src/lib/cli/tui.tsx` — nueva opción de navegación para grupos (depende de que las tools MCP de
  grupos ya existan).
- Sin impacto en Vercel/Neon.
