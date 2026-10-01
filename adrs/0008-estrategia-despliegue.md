# ADR 0008: Estrategia de despliegue

## Estado

Aceptado

## Contexto

Vercel free tier y Neon Postgres son restricciones mandatorias dadas por el usuario (no una
decisión de esta interview). Lo que sí queda abierto es cómo se ejecutan las migraciones de Prisma
en cada deploy y cómo se aíslan los preview deployments de Vercel (uno por PR) frente a la base de
datos, para un equipo de una sola persona.

## Decisión

- Las migraciones corren con `prisma migrate deploy` como parte del build step de Vercel
  (`prisma migrate deploy && next build`), automático en cada deploy a producción.
- Cada preview deployment de Vercel usa una branch de Neon aislada, creada por la integración
  oficial Neon-Vercel (incluida en el free tier).

## Alternativas consideradas

- **Migraciones vía GitHub Action separado, desacoplado del build de Vercel** — da control
  explícito sobre cuándo corren, pero agrega un paso manual a coordinar en cada release para un
  equipo de una persona sin necesidad real de ese control adicional hoy.
- **Todos los previews compartiendo la misma DB de desarrollo** — evita configurar la integración
  de branching, pero dos PRs con migraciones distintas corriendo al mismo tiempo podrían chocar
  entre sí en la misma base compartida.

## Consecuencias

- Cero pasos manuales: cada deploy (producción o preview) trae su propio estado de datos
  consistente con el código que se está desplegando.
- Si una migración de Prisma falla, el build de Vercel falla y bloquea el deploy — deseable como
  fail-safe, pero significa que el build step necesita credenciales con permiso de escritura sobre
  el schema de la base de datos de producción.
- Si una migración falla a medias (aplicó parte de sus statements antes de fallar), no hay rollback
  automático: `prisma migrate deploy` no revierte una migración parcialmente aplicada. Proporcional
  al alcance (proyecto de una sola persona, free tier), se acepta como riesgo manual — el deploy
  queda bloqueado y requiere intervención directa sobre la base antes de reintentar.
