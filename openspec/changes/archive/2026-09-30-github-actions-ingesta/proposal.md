# Proposal

## Why

El repositorio actúa como la fuente de verdad de las skills públicas del registro (en la carpeta `skills/`). Actualmente no existe un mecanismo automatizado de integración continua que garantice la integridad sintáctica y semántica de los archivos `SKILL.md`, verifique el versionado semántico (SemVer), ni sincronice automáticamente las skills y sus versiones hacia la base de datos PostgreSQL local.

Implementar este pipeline de GitHub Actions y sus scripts de validación e ingesta asegura que ninguna skill mal formada o con versión inválida entre al registro, y automatiza la persistencia de `Skill` y `SkillVersion` en la base de datos tras cada publicación.

## What Changes

- Creación del workflow de GitHub Actions para validación y linting de `SKILL.md` en PRs y pushes.
- Validación estricta del frontmatter YAML de cada `SKILL.md` (campos obligatorios: `name`, `version`, `description`, `author`, `license`, `repository`).
- Validación de Semantic Versioning (SemVer) y verificación de incremento de versión respecto al historial registrado.
- Creación del script/mecanismo de ingesta que parsea `SKILL.md` y registra/actualiza `Skill` y crea `SkillVersion` en PostgreSQL (vía Prisma).
- Automatización de generación de git tag / GitHub release para versiones publicadas.
- Scripts de validación e ingesta ejecutables tanto en CI como localmente contra el Postgres de desarrollo local.

## Capabilities

### New Capabilities
- `skill-ingestion`: Validación estructural de `SKILL.md` (frontmatter YAML, campos requeridos), validación de SemVer, generación de tags de versión e ingesta automatizada de `Skill` y `SkillVersion` en PostgreSQL.

### Modified Capabilities
<!-- No se modifican los requerimientos de capabilities existentes -->

## Impact

- **Workflows:** Agrega `.github/workflows/validate-skills.yml` e `ingest-skills.yml` (o workflow unificado).
- **Scripts / CLI:** Agrega scripts en TypeScript (ej. en `scripts/` o `src/lib/skills/`) para validación de frontmatter, chequeo de semver e inserción en PostgreSQL vía `@prisma/client`.
- **Base de datos:** Inserción de registros en las tablas `User` (dueño de la skill), `Skill` y `SkillVersion` en el PostgreSQL local.
- **Dependencias:** Utilidades para parsing de YAML/Markdown (ej. `gray-matter` o `yaml`), validación SemVer (`semver`), y cliente Prisma ya configurado.
