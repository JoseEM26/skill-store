# ADR 0003: Modelo de datos

## Estado

Aceptado

## Contexto

No hay `Design.md` disponible, así que las entidades se derivan solo del PRD: skills con versiones/
changelog, contextos (ideas privadas + referencias externas gestionadas desde el mismo backend),
usuarios vía GitHub OAuth, tokens de acceso con scopes granulares (`read`/`write`/`delete`), y los
contadores de descargas/instalaciones y expiración/último-uso de token agregados al PRD.

## Decisión

- **User** — `id`, `githubId`, `username`, `avatarUrl`, `createdAt`.
- **Skill** — `id`, `slug` (único por dueño, ej. `usuarioA/mi-skill`), `name`, `description`,
  `ownerId → User`, `license`, `repositoryUrl`, `downloadsCount`, `installsCount`, `isArchived`,
  `createdAt`, `updatedAt`.
- **SkillVersion** — `id`, `skillId → Skill`, `version` (semver), `changelog`, `gitTag`,
  `publishedAt`.
- **Context** — una sola tabla para ideas privadas y referencias externas, con `type`
  (`idea` | `external_reference`) como discriminador: `id`, `type`, `title`, `body`,
  `link` (nullable, solo aplica a `external_reference`), `tags[]`, `ownerId → User`,
  `isPublic` (default `false` para `idea`), `isArchived`, `createdAt`, `updatedAt`. El PRD exige que
  las referencias externas sean siempre públicas (nunca privadas): se fuerza con un
  `CHECK (type != 'external_reference' OR "isPublic" = true)` a nivel de Postgres, no solo
  validación de aplicación — así ni un bug ni un acceso directo a la DB puede dejar una referencia
  externa marcada como privada.
- **AccessToken** — `id`, `ownerId → User`, `tokenHash`, `scopes` (array simple de
  `read`/`write`/`delete`), `label`, `expiresAt` (nullable), `lastUsedAt` (nullable),
  `revokedAt` (nullable), `createdAt`.

## Alternativas consideradas

- **Dos tablas separadas para Context** (`Idea` y `ExternalReference`) — más aislamiento por tipo,
  pero duplica lógica de owner/visibilidad/tags que hoy es idéntica entre ambos; se descartó.
- **Tabla normalizada `TokenScope`** (una fila por scope por token) en vez de array — más flexible
  si los scopes dejaran de ser un set fijo, pero es una tabla extra para 3 valores cerrados que hoy
  no lo necesitan; se descartó.

## Consecuencias

- Un solo `Context` con discriminador simplifica queries de "todo lo mío" (ideas + referencias) en
  una sola tabla, y el modelo entero queda representable con 5 tablas en Prisma.
- Si en el futuro un contexto necesita campos exclusivos de un tipo (ej. metadata solo de
  referencias externas), la tabla única obliga a que esos campos sean nullable para el otro tipo —
  trade-off aceptado a cambio de simplicidad hoy.
- El `CHECK` constraint solo fija el piso (`external_reference` nunca puede ser privado); no impide
  que una `idea` se marque pública explícitamente, que sigue siendo una elección válida del dueño
  según el PRD.
