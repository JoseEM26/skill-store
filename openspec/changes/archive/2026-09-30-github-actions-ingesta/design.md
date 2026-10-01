# Design

## Context

Ver `proposal.md` y `specs/skill-ingestion/spec.md`. El proyecto cuenta con un Postgres local en Docker (`postgresql://postgres:postgres@localhost:5433/skill_store`) y el esquema Prisma ya definido en `prisma/schema.prisma`. Los archivos de skills residen en `skills/<skill-name>/SKILL.md`.

## Goals / Non-Goals

**Goals:**
- Validar frontmatter YAML de todos los `SKILL.md` mediante Zod compartiendo esquemas de validación.
- Verificar SemVer contra versiones previas para evitar regresiones o colisiones de versión.
- Proveer scripts TypeScript ejecutables tanto en local (`pnpm test:skills`, `pnpm db:ingest-skills`) como dentro del pipeline de GitHub Actions.
- Insertar/actualizar `Skill` y `SkillVersion` en Postgres local garantizando atomicidad y unicidad por `[ownerId, slug]`.

**Non-Goals:**
- Despliegue a producción o conexión con Neon / Vercel (reservado exclusivamente para el ítem #15).
- Soporte para repositorios git externos en este ítem (las skills se leen de la carpeta local `skills/`).
- Interfaz web o MCP para subir skills (cubiertos en ítems posteriores del backlog).

## Decisions

### 1. Reutilización de Zod y scripts TypeScript con `tsx`
- **Decisión:** Los validadores de `SKILL.md` se implementan en TypeScript (`src/lib/skills/validation.ts`) y se ejecutan mediante scripts CLI (`scripts/validate-skills.ts`) usando `tsx` o `pnpm`.
- **Razón:** Permite reutilizar los esquemas Zod en el backend / API sin duplicar lógica de validación entre CI y la aplicación.
- **Alternativas consideradas:**
  - *Action de GitHub en Python/Shell:* Descartado para mantener el stack unificado en TypeScript (ADR-0001) y poder testear localmente con `vitest`.

### 2. Ingesta directa a PostgreSQL vía Prisma Client
- **Decisión:** El script de ingesta (`scripts/ingest-skills.ts`) instancia el cliente Prisma y realiza transacciones (`prisma.$transaction`) para crear/actualizar la `Skill` e insertar el registro `SkillVersion`.
- **Razón:** Evita levantar un servidor HTTP intermedio durante el pipeline de CI o pruebas locales; ejecuta las operaciones contra `DATABASE_URL` directamente.
- **Alternativas consideradas:**
  - *Llamar a un endpoint REST interno:* Requiere levantar la aplicación Next.js y manejar autenticación/tokens de ingestión antes de tener el módulo de auth completado.

### 3. Asignación del dueño (`ownerId`) en la ingesta
- **Decisión:** El script de ingesta resuelve o crea el usuario dueño en la tabla `User` utilizando el campo `author` o `githubId` extraído del frontmatter o configuración de entorno (ej. usuario por defecto del repositorio), asegurando el cumplimiento del invariante "Todo recurso tiene un dueño" (ADR-0003).
- **Razón:** La tabla `Skill` requiere `ownerId NOT NULL`.

## Risks / Trade-offs

- [Desfase entre tags de Git y base de datos si la ingesta falla tras crear el tag] → Mitigación: El workflow ejecuta primero la validación y prueba de ingesta; el tag/release se publica una vez confirmada la integridad.
- [Dependencia de la base de datos local en CI] → Mitigación: El workflow de GitHub Actions levanta un servicio Postgres en Docker para ejecutar las migraciones y la prueba de ingesta en el pipeline.
