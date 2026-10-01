# Design

## Context

Ver `proposal.md` para el porqué. El schema de entidades ya está decidido en ADR-0003; este
documento cubre cómo se traduce a Prisma + Postgres local, y cómo se cierra el hueco que encontró
la revisión adversarial del TECH-DESIGN sobre la visibilidad de `Context`.

## Goals / Non-Goals

**Goals:**
- Schema de Prisma que refleje ADR-0003 exactamente (User, Skill, SkillVersion, Context,
  AccessToken).
- Postgres local en Docker, aislado de otros contenedores de esta máquina, con la primera
  migración aplicada.
- Garantizar a nivel de base de datos que `external_reference` sea siempre público (hallazgo
  Crítico #2 de la revisión adversarial de `TECH-DESIGN.md`).

**Non-Goals:**
- Validación de escritura en API/Server Actions (Zod, ownership) — eso es de los ítems #7
  (panel admin) y #10 (MCP de escritura).
- Algoritmo de hash de los tokens de acceso — el campo `tokenHash` es un `String` genérico en
  este ítem; qué función de hash lo llena se decide en el ítem #8 (tokens MCP), donde también se
  resuelve el hallazgo Crítico #3 de la revisión adversarial (bcrypt/argon2 es demasiado lento
  para validar un token en cada llamada MCP — ahí se evalúa un hash rápido en su lugar).
- Conexión a Neon — se migra contra Postgres local; el driver serverless de Neon
  (`@neondatabase/serverless`, ADR-0001) se adopta cuando se conecte Neon de verdad.

## Decisions

- **Postgres 16 en Docker, puerto propio de este proyecto.** Esta máquina ya corre un Postgres de
  otro proyecto en el puerto 5432 — se usa un puerto distinto (5433) y un volumen con nombre
  propio para no colisionar ni compartir datos entre proyectos.
- **Constraint de unicidad compuesta `(ownerId, slug)` en `Skill`**, en vez de un `slug` único
  global — matchea ADR-0003 ("único por dueño") y resuelve a nivel de esquema la mitad del
  hallazgo Advertencia #4 de la revisión adversarial (la otra mitad, cómo se rutea `owner/slug`
  en la API, es del ítem #12).
- **CHECK constraint en `Context`** que impide guardar una fila con `type = 'external_reference'`
  e `isPublic = false`. Alternativa descartada: dejarlo solo como default de aplicación (Zod) sin
  constraint en DB — se descarta porque el propio PRD dice que las referencias externas son
  siempre públicas "sin excepción", y un default de aplicación no impide un `UPDATE` directo o un
  bug futuro que la viole; el constraint en DB sí.
- **`.env.example` versionado, `.env` real ignorado por git** — ya existe `.gitignore` con
  `.env*` desde el ítem #1; se agrega el ejemplo con placeholders para que cualquiera pueda
  levantar el contenedor local sin secretos reales.

## Risks / Trade-offs

- El CHECK constraint solo impide el estado inválido a nivel de fila; no reemplaza la validación
  de negocio en la capa de escritura (ítems #7/#10) — es una red de seguridad adicional, no la
  única.
- Migrar contra Postgres local y no contra Neon significa que el comportamiento específico del
  driver serverless de Neon (HTTP/WebSocket, ADR-0001) no se valida todavía — riesgo aceptado a
  propósito por la decisión de desarrollo 100% local (`BACKLOG.md`); se revisita cuando se conecte
  Neon.
