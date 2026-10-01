# Tasks

## 1. Validación de SKILL.md y SemVer

- [x] 1.1 Implementar el esquema Zod y utilidades de parsing para el frontmatter de `SKILL.md` (`src/lib/skills/validation.ts`), asegurando la validación estricta de `name`, `version`, `description`, `author`, `license` y `repository`, y verificar con tests unitarios en Vitest (`pnpm test`).
- [x] 1.2 Implementar la lógica de verificación de Semantic Versioning (SemVer) e incremento de versión comparando contra versiones previas (`src/lib/skills/semver.ts`), y verificar casos válidos, mal formados y regresiones de versión con tests unitarios en Vitest.
- [x] 1.3 Crear el script ejecutable de validación de directorio (`scripts/validate-skills.ts`) y agregarlo a `package.json` como script `pnpm test:skills`, verificando que valide correctamente todos los archivos existentes en la carpeta `skills/`.

## 2. Ingesta en PostgreSQL Local

- [x] 2.1 Implementar el módulo de sincronización e ingesta (`src/lib/skills/ingest.ts`) que resuelve/crea el usuario dueño en `User` y realiza transacciones atómicas en Prisma para crear/actualizar `Skill` e insertar `SkillVersion`, verificando mediante tests de integración contra el Postgres local en Docker.
- [x] 2.2 Crear el script CLI de ingesta (`scripts/ingest-skills.ts`) y registrar el comando `pnpm db:ingest-skills` en `package.json`, verificando la inserción y consistencia de datos en la base de datos local consultando con Prisma Studio o cliente SQL.

## 3. Workflows de GitHub Actions

- [x] 3.1 Crear el workflow de CI `.github/workflows/validate-skills.yml` para ejecutar validación de frontmatter y SemVer en cada Pull Request y push, verificando que la estructura YAML sea válida.
- [x] 3.2 Crear el workflow de publicación `.github/workflows/release-and-ingest.yml` para disparar tag/release e ingesta en merge a la rama principal, verificando la configuración de pasos y permisos de GitHub.
