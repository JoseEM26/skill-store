# Tasks

## 1. Base de datos y catálogo (hacer primero, en solitario — todo lo demás depende de esto)

- [x] 1.1 Agregar `isPublic Boolean @default(true)` e `isPaused Boolean @default(false)` al modelo
      `Skill` en `prisma/schema.prisma`, migrar contra el Postgres local (`npx prisma migrate dev`)
      y verificar que las 13 skills existentes quedan con `isPublic: true, isPaused: false` sin
      perder datos.
- [x] 1.2 Actualizar `src/lib/catalog/queries.ts` (catálogo público) para excluir
      `isPublic: false` o `isPaused: true` salvo que la consulta la haga el propio dueño
      autenticado, y verificar con tests que una skill privada/pausada de otro usuario no aparece
      en el listado ni en el detalle (404 directo a la URL).

## 2. Panel de administración (en paralelo con el grupo 3, después del grupo 1)

- [x] 2.1 Agregar en `src/lib/admin/skills.ts` la capacidad de actualizar `isPublic`/`isPaused` de
      una skill propia (reusar `updateUserSkill`, respetando que no se pueda tocar una skill
      archivada), y verificar con tests de aislamiento por dueño (igual patrón que el resto del
      panel).
- [x] 2.2 Agregar en `src/components/admin/SkillList.tsx` los controles de alternar
      visibilidad/pausado por skill, y el modal de confirmación de borrado con el texto de
      advertencia condicional según `isPublic` (ver ADR-0011 para el texto exacto de cada caso),
      verificando el renderizado de ambos casos con React Testing Library.

## 3. Servidor MCP (en paralelo con el grupo 2, después del grupo 1)

- [x] 3.1 Actualizar `handlePublishSkill`/`handleUpdateSkill` (o equivalentes) en
      `src/lib/mcp/tools.ts` para aceptar y aplicar `isPublic`/`isPaused`, con la misma verificación
      de propiedad que el resto de las tools de escritura, y verificar con un test que un token de
      otro dueño no puede cambiar la visibilidad de una skill ajena.
- [x] 3.2 Actualizar `handleListSkills`/`handleSearchSkills`/`handleGetSkill` para excluir
      `isPublic: false`/`isPaused: true` salvo que el token pertenezca al dueño, verificando con un
      test que el propio dueño sí ve sus skills privadas/pausadas vía MCP y otro usuario no.

## 4. Verificación integral

- [x] 4.1 Ejecutar `pnpm test && pnpm build && pnpm lint` con todos los cambios integrados y
      verificar que no quede ningún test roto.
