# Tasks

## 1. Backend + panel

- [x] 1.1 En `src/lib/admin/groups.ts`, relajar `addSkillToGroup` para aceptar la skill si es del
      dueño del grupo (`ownerId`) **o** si es pública, no pausada y no archivada
      (`isPublic: true, isPaused: false, isArchived: false`), en vez de exigir siempre
      `ownerId === ownerId`.
- [x] 1.2 En `src/app/admin/groups/page.tsx`, traer también `getPublicCatalog({ type: 'skills' })`
      (de `src/lib/catalog/queries.ts`) y pasarlo a `GroupList` junto con `getUserSkills`,
      deduplicando por `id`.
- [x] 1.3 En `src/components/admin/GroupList.tsx`, mostrar en el selector de "agregar skill" tanto
      las propias como las públicas de otros dueños (con alguna indicación visual de quién es el
      dueño, ej. "owner/slug").
- [x] 1.4 Tests: agregar una skill pública de otro dueño a un grupo propio funciona; agregar una
      skill privada o pausada de otro dueño se sigue rechazando; agregar una skill propia (privada
      o pública) sigue funcionando igual que antes (regresión).

## 2. Verificación integral

- [x] 2.1 Ejecutar `pnpm test && pnpm build && pnpm lint` y verificar que no quede ningún test
      roto.
