# Proposal

## Why

Todo lo demás del backlog (catálogo, auth, panel admin, tokens, MCP) lee o escribe sobre las
mismas 5 entidades. Sin el schema de Prisma migrado contra una base real, ningún ítem posterior
puede implementarse ni verificarse de punta a punta. Desarrollo 100% local por ahora: se migra
contra un Postgres en Docker, no contra Neon todavía (BACKLOG.md → "Desarrollo local primero").

## What Changes

- Definir el schema de Prisma completo según ADR-0003: `User`, `Skill`, `SkillVersion`,
  `Context` (discriminador `type`: `idea` | `external_reference`), `AccessToken`.
- Levantar un Postgres 16 local en Docker (contenedor propio de este proyecto, puerto distinto al
  que ya usan otros proyectos en esta máquina) y correr la primera migración contra él.
- Cerrar un hueco de la revisión adversarial del TECH-DESIGN (hallazgo Crítico #2): `isPublic` en
  `Context` no puede tener el mismo default para `idea` y `external_reference` — el PRD exige que
  las referencias externas sean siempre públicas. Se agrega un CHECK constraint a nivel de
  base de datos que lo garantiza, además del default de aplicación.

## Capabilities

### New Capabilities

- `data-model`: entidades, relaciones y restricciones de integridad del registro (usuarios,
  skills, versiones, contextos, tokens de acceso) — qué datos existen y qué invariantes garantiza
  la base, no las reglas de autorización de quién puede escribir qué (eso es de items
  posteriores: panel admin #7, tokens MCP #8).

## Impact

- **Código**: agrega Prisma (`schema.prisma`, cliente generado) al proyecto Next.js del ítem #1.
- **Infraestructura**: contenedor Docker Postgres 16 local para desarrollo (nuevo, no interfiere
  con contenedores de otros proyectos en esta máquina). Sigue sin tocar Neon/Vercel.
- **Dependencias**: `prisma`, `@prisma/client`.
- **Config**: `.env` local con `DATABASE_URL` apuntando al contenedor (no versionado; se agrega
  `.env.example` versionado con placeholders).
