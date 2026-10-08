# Tasks

## 1. Modelo de datos y CRUD base (hacer primero, en solitario — todo lo demás depende de esto)

- [x] 1.1 Agregar `SkillGroup` (`id`, `name`, `ownerId → User`, `createdAt`, `updatedAt`) y
      `SkillGroupItem` (`groupId → SkillGroup`, `skillId → Skill`, `addedAt`,
      `@@unique([groupId, skillId])`) a `prisma/schema.prisma`, migrar contra el Postgres local.
- [x] 1.2 Crear `src/lib/admin/groups.ts` con funciones ownership-aware (mismo patrón que
      `src/lib/admin/skills.ts`): `getUserGroups(ownerId)`, `createUserGroup(ownerId, name)`,
      `renameUserGroup`, `deleteUserGroup`, `addSkillToGroup(ownerId, groupId, skillId)` (rechaza
      si la skill no es del mismo `ownerId`), `removeSkillFromGroup`.
- [x] 1.3 Tests: creación/renombrado/borrado de grupo propio; agregar una skill ajena a un grupo
      propio se rechaza; borrar un grupo no borra sus skills; una misma skill puede estar en dos
      grupos distintos.

## 2. Panel: UI de gestión de grupos (en paralelo con el grupo 3, después del grupo 1)

- [x] 2.1 Nueva sección/página en `/admin` (ej. `/admin/groups` o integrada en `/admin/skills`)
      para crear/renombrar/borrar grupos propios y agregar/quitar skills propias de un grupo
      (checkboxes o selector), usando las funciones de `src/lib/admin/groups.ts` vía Server
      Actions (mismo patrón que `src/app/admin/actions.ts`).
- [x] 2.2 Tests de componente: crear un grupo, agregar una skill, verla listada dentro del grupo;
      intentar agregar una skill ajena se rechaza visualmente con un error claro.

## 3. MCP: lectura de grupos (en paralelo con el grupo 2, después del grupo 1)

- [x] 3.1 Agregar `handleListGroups`/`handleGetGroup` en `src/lib/mcp/tools.ts`: `list_groups`
      devuelve los grupos del dueño del token (nombre, cantidad de skills); `get_group` devuelve
      el grupo con la lista completa de sus skills (incluyendo `files`), aplicando el mismo
      criterio de visibilidad/propiedad ya usado en `handleGetSkill` por cada skill del grupo
      (omitir, no fallar, si una no es visible para quien consulta).
- [x] 3.2 Registrar ambas tools en `AVAILABLE_TOOLS` y el switch de `src/app/api/mcp/route.ts`.
- [x] 3.3 Tests: `list_groups` solo devuelve grupos del dueño del token; `get_group` omite una
      skill que el dueño pausó/privatizó cuando la consulta la hace otro usuario; un token ajeno
      no puede leer `get_group`/`list_groups` de otro dueño.

## 4. CLI: pull-group y opción en tui (después de los grupos 2 y 3 — depende de que las tools MCP de grupos existan)

- [x] 4.1 Agregar el comando `pull-group <nombre>` en `bin/skills-cli.ts`/`src/lib/cli/commands.ts`:
      llama `get_group` vía MCP y hace `pull` de cada skill del resultado, informando el resultado
      individual de cada una sin abortar el resto si una falla.
- [x] 4.2 Agregar una opción en `src/lib/cli/tui.tsx` para elegir uno de los grupos guardados
      (vía `list_groups`) y traerlo completo (equivalente a `pull-group`).
- [x] 4.3 Tests: `pull-group` sobre un grupo con varias skills las trae todas; sobre un grupo que
      no existe o no es propio, informa el error sin traer nada; la opción de grupos en `tui`
      dispara el mismo flujo.

## 5. Verificación integral

- [x] 5.1 Ejecutar `pnpm test && pnpm build && pnpm lint` con todos los cambios integrados y
      verificar que no quede ningún test roto.
