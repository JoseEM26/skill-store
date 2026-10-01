# Tasks

## 1. Postgres local en Docker

- [x] 1.1 Agregar `docker-compose.yml` con un servicio `postgres:16` en el puerto `5433`, volumen
      nombrado propio de este proyecto, y verificar que `docker compose up -d` deja el contenedor
      en estado `healthy`
- [x] 1.2 Crear `.env.example` con `DATABASE_URL` de ejemplo apuntando a ese contenedor, y `.env`
      local (no versionado) con el valor real, y verificar que `.env` está cubierto por
      `.gitignore`

## 2. Schema de Prisma

- [x] 2.1 Instalar `prisma` y `@prisma/client`, inicializar `prisma/schema.prisma` apuntando a
      `DATABASE_URL`, y verificar que `pnpm prisma validate` no reporta errores
- [x] 2.2 Definir el modelo `User` (`id`, `githubId`, `username`, `avatarUrl`, `createdAt`) y
      verificar con `pnpm prisma validate`
- [x] 2.3 Definir `Skill` con `@@unique([ownerId, slug])` y verificar con `pnpm prisma validate`
      que la constraint compuesta queda declarada
- [x] 2.4 Definir `SkillVersion` relacionado a `Skill` y verificar con `pnpm prisma validate`
- [x] 2.5 Definir `Context` con discriminador `type` (`idea` | `external_reference`) y verificar
      con `pnpm prisma validate`
- [x] 2.6 Definir `AccessToken` (`scopes` como array, `expiresAt`/`lastUsedAt`/`revokedAt`
      nullable) y verificar con `pnpm prisma validate`

## 3. Migración e invariantes

- [x] 3.1 Generar y aplicar la primera migración contra el Postgres local
      (`pnpm prisma migrate dev --name init`) y verificar que corre sin errores
- [x] 3.2 Agregar el CHECK constraint de `Context` (`type != 'external_reference' OR "isPublic" =
      true`) como SQL manual dentro de esa misma migración, y verificar insertando de prueba: un
      `external_reference` con `isPublic = false` debe fallar, uno con `isPublic = true` debe
      insertarse
- [x] 3.3 Verificar el resto de invariantes del spec delta (`specs/data-model/spec.md`) con datos
      de prueba: dos skills con el mismo slug y dueños distintos se insertan sin error; la misma
      combinación `(ownerId, slug)` repetida falla

## 4. Cliente tipado

- [x] 4.1 Generar el cliente de Prisma (`pnpm prisma generate`) y verificar que `pnpm build`
      (del ítem #1) sigue compilando sin errores con el cliente importado en al menos un archivo
      de prueba
