# Design

## Context
Ver `proposal.md` y `specs/data-model/spec.md`. El modelo `Skill` ya cuenta con los campos `downloadsCount` e `installsCount` en Postgres local. La regla transversal de autenticación exige 3 condiciones (token + scope + owner), pero ADR-0009 establece una excepción explícita para el incremento de contadores públicos.

## Goals / Non-Goals

**Goals:**
- Proporcionar endpoints REST y Server Actions para incrementar atómicamente `downloadsCount` y `installsCount`.
- Permitir la invocación pública sin token ni sesión de usuario para estos eventos de conteo.
- Reflejar los contadores actualizados en Server Components de catálogo y vista de detalle.

**Non-Goals:**
- No implementar deduplicación de IPs ni huellas digitales de cliente complejas (descartado en ADR-0009).
- No construir un sistema de reviews, ratings por estrellas ni analítica avanzada.
- No modificar esquemas ni migrar bases de datos (los campos ya existen en el schema de Prisma).

## Decisions

### 1. Actualización atómica en Postgres vía Prisma `increment`
- **Decisión:** Usar `prisma.skill.update({ where: { ownerId_slug: { ownerId, slug } }, data: { downloadsCount: { increment: 1 } } })` en lugar de lectura previa y guardado en memoria.
- **Razón:** Evita condiciones de carrera (race conditions) ante descargas o instalaciones concurrentes sin necesidad de locks explícitos a nivel de aplicación.
- **Alternativas consideradas:**
  - *Tabla de eventos append-only*: mayor sobrecarga de almacenamiento y queries `COUNT()` lentas; innecesario para un contador informativo.

### 2. Endpoints REST dedicados y Server Actions
- **Decisión:** Exponer `POST /api/skills/[owner]/[slug]/download` y `POST /api/skills/[owner]/[slug]/install` con validación Zod de parámetros (`owner`, `slug`). En frontend web, el botón "Descargar" dispara la Server Action correspondiente o fetch al endpoint.
- **Razón:** Compatibilidad tanto para clientes web (Next.js Server Actions / API) como para clientes externos (MCP / CLI).

## Risks / Trade-offs

- [Inflación de métricas por bots/scrapers] → Mitigado por el rate limiting general por IP (ADR-0007); aceptado en ADR-0009 dado que los contadores son netamente informativos.
- [Conexiones a Postgres en picos de descargas] → Mitigado mediante queries directas y ligeras de un solo `UPDATE` indexado por clave compuesta `(ownerId, slug)`.

## Open Questions

- *Reporte desde CLI externa*: Si una CLI de terceros instala una skill fuera del MCP oficial, dependerá de que la CLI invoque voluntariamente el endpoint `POST /api/skills/[owner]/[slug]/install`.
