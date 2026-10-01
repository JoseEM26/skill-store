# Proposal

## Why

Los desarrolladores y usuarios de Claude Code necesitan una interfaz web pública y accesible para descubrir, buscar e inspeccionar skills y contextos (ideas públicas y referencias externas del ecosistema) sin fricción ni requisito de autenticación.

Actualmente, tras la ingesta de datos en PostgreSQL, no existe una vista visual para consultar el catálogo, inspeccionar los detalles de una skill o contexto, ni consultar el historial de cambios (changelog) y comandos de instalación.

## What Changes

- Creación de la página principal del catálogo público (`/` o `/skills` y `/contexts`) basada en React Server Components que consulta PostgreSQL directamente mediante Prisma.
- Búsqueda y filtrado por texto (título, descripción, tags) y tipo de recurso, gestionados puramente a través de URL query params (`?q=...`, `?type=...`).
- Visualización de la vista detallada de una skill (`/skills/[owner]/[slug]`), mostrando metadatos (autor, licencia, repositorio, descargas/instalaciones), versión actual, comando de instalación y lista histórica de versiones con sus respectivos changelogs.
- Visualización de la vista detallada de un contexto público (`/contexts/[id]`), respetando la restricción estricta de visibilidad (solo `isPublic = true`).
- Componentes de UI accesibles y responsivos estilizados con Tailwind CSS, incluyendo estados vacíos explícitos ("Sin resultados") y manejo de errores cuando el recurso no existe (404).

## Capabilities

### New Capabilities
- `public-catalog`: Navegación, búsqueda, filtrado y visualización detallada (incluyendo changelog e historial de versiones) de skills y contextos públicos mediante React Server Components sin requerir autenticación.

### Modified Capabilities
<!-- No se modifican los requerimientos de capabilities existentes -->

## Impact

- **Frontend / Rutas:** Agrega páginas en Next.js App Router (`src/app/(public)/...` o `src/app/...`), componentes de catálogo (`SkillCard`, `ContextCard`, `SearchInput`, `VersionHistory`, `EmptyState`).
- **Lógica de Datos:** Consultas Prisma optimizadas en el servidor para búsqueda y filtrado de `Skill`, `SkillVersion` y `Context` públicos.
- **Acceso / Seguridad:** Garantiza que únicamente los recursos públicos (`Context.isPublic == true` y skills no archivadas) sean expuestos en las vistas públicas.
