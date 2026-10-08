# ADR 0015: Grupos (colecciones) de skills

## Estado

Aceptado (implementado como ítem #19 del backlog)

## Contexto

Hoy el CLI/`tui` solo trae skills de a una. El usuario quiere poder armar, desde el panel web,
**grupos nombrados de skills propias** (ej. "mi-stack-react": 10 skills agrupadas), y después,
desde cualquier otro proyecto, traer el grupo entero de una sola vez en vez de una por una.

## Decisión

1. **Nuevo modelo de datos**: `SkillGroup` (`id`, `name`, `ownerId → User`, `createdAt`,
   `updatedAt`) y tabla de unión `SkillGroupItem` (`groupId → SkillGroup`, `skillId → Skill`,
   `addedAt`) — relación muchos-a-muchos, una skill puede estar en varios grupos.
2. **Gestión de grupos solo desde el panel web** (`/admin/groups` o dentro de `/admin/skills`):
   crear/renombrar/borrar un grupo propio, agregar/quitar skills propias de un grupo (borrar un
   grupo no borra las skills, solo la agrupación). No se expone creación/edición de grupos vía MCP
   en esta primera versión — el usuario pidió explícitamente que la gestión sea "a través de la
   plataforma web".
3. **Lectura y pull vía MCP/CLI**: nuevas tools de solo lectura `list_groups` (grupos del dueño del
   token) y `get_group` (nombre + lista de skills del grupo, cada una con su `files`, aplicando
   exactamente los mismos filtros de propiedad/visibilidad que ya aplica `get_skill` — si una skill
   del grupo dejó de ser visible para quien pide el grupo, se omite en vez de fallar todo el grupo).
   CLI: nuevo comando `pull-group <nombre>` (o flag `--group` sobre `pull`) que trae todas las
   skills del grupo de una sola vez, reusando `handlePull` por cada una.
4. **Integración en `tui`**: una opción para elegir un grupo guardado y traerlo completo, además de
   la selección múltiple ad-hoc ya agregada en la revisión de paginación de ADR-0013.

## Alternativas consideradas

- **Grupos como un array de IDs en `Skill`/`User` en vez de tabla de unión** — se descarta: una
  relación muchos-a-muchos real (una skill en varios grupos) necesita una tabla de unión propia en
  Postgres/Prisma; un array sería más frágil para mantener consistencia referencial.
- **Permitir crear/editar grupos también vía MCP** — se descarta para esta versión: el pedido fue
  específicamente que la gestión sea desde la plataforma web; agregarlo a MCP es trabajo futuro si
  hace falta.
- **Fallar todo el `get_group` si una sola skill del grupo ya no es visible** — se descarta: sería
  frágil (un grupo entero se rompe por una skill que el dueño pausó/privatizó sin querer romper el
  resto) — se omite esa skill puntual en la respuesta.

## Consecuencias

- Requiere una migración de Prisma (`SkillGroup` + `SkillGroupItem`, tablas nuevas, sin tocar
  modelos existentes).
- Nueva superficie en el panel admin (CRUD de grupos) y dos tools MCP de lectura nuevas.
- El CLI gana un comando/flag nuevo (`pull-group`) y el `tui` una opción nueva de navegación.
- No resuelve el modelo de licencia por skill (sigue abierto, ver PRD.md → Historial de cambios).

## Revisión 2026-10-05: un grupo puede incluir skills públicas de otros dueños

En la práctica, un usuario recién logueado todavía no publicó ninguna skill propia (las 13 de
ejemplo pertenecen a `Aybar-Corp`, no al usuario real) — con la decisión original ("agregar/quitar
**skills propias** de un grupo"), el selector del panel queda vacío y la función no sirve para el
caso de uso real: armar una colección personal de skills de la comunidad para traerlas juntas
después.

- **Decisión:** `addSkillToGroup` deja de exigir `skill.ownerId === ownerId`. En su lugar, una
  skill se puede agregar al grupo si **(a)** es del propio dueño del grupo (incluida privada/
  pausada propia), **o (b)** es pública y no pausada (`isPublic && !isPaused && !isArchived`) —
  exactamente el mismo criterio de visibilidad que ya usa `get_group` (MCP) para decidir qué
  skills de un grupo mostrar. La propiedad del **grupo** en sí sigue siendo exclusiva del dueño
  (no cambia); lo que se relaja es de quién puede ser la skill agregada.
- **Panel:** el selector de skills para agregar a un grupo deja de ser solo "mis skills"
  (`getUserSkills`) — pasa a mostrar también el catálogo público (`getPublicCatalog`), para que el
  usuario pueda armar una colección con skills de la comunidad, no solo las que publicó él mismo.
- **`get_group` (MCP) no cambia** — ya aplicaba este mismo criterio de visibilidad por skill desde
  el diseño original (pensado para el caso de que una skill propia del grupo dejara de ser
  pública); ahora ese mismo chequeo es también la razón por la que una skill ajena-pero-pública sí
  se expone al traer el grupo.
- **Razón del cambio:** el caso de uso real que motivó pedir "grupos" era justamente poder juntar
  skills de la comunidad (no necesariamente propias) para traerlas todas de una — la restricción
  original lo hacía inútil para cualquier usuario que no hubiera publicado nada.
