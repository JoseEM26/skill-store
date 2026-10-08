# Proposal

## Why

El registro es una comunidad: cada usuario gestiona su propio catálogo (ya implementado en el
ítem #16) y debe poder subir el contenido real de sus skills de dos formas — vía MCP desde su
propio agente, o manualmente desde el panel. Hoy ninguna de las dos acepta contenido real, solo
metadata suelta, y no existe ninguna plantilla obligatoria para el cuerpo de una skill.

## What Changes

- Nuevo schema de frontmatter YAML (reemplaza el actual): `name`, `description`, `license`,
  `compatibility`, `metadata.version`, `metadata.author`. `repository` deja de ser parte del
  frontmatter obligatorio.
- Nueva validación de estructura del body: 6 secciones obligatorias como headings `## N. <Título>`
  en orden fijo (Propósito y Cuándo Usar, Flujo de Trabajo, Reglas y Restricciones, Árbol de
  Decisión, Ejemplos Ejecutables, Manejo de Errores).
- Validador único reusado por los tres caminos de publicación: ingesta de GitHub Action, panel
  admin, MCP `publish_skill`.
- Panel: nueva opción en `/admin/skills` para cargar/editar el contenido completo (markdown) de
  una skill, validado antes de guardarse.
- MCP: `publish_skill` acepta un parámetro opcional `content` (markdown completo); si se omite,
  sigue funcionando como hoy (solo metadata).
- Las 13 skills de ejemplo no se migran retroactivamente — la plantilla aplica solo a
  publicaciones nuevas.

## Capabilities

### Modified Capabilities
- `skill-ingestion` — nuevo schema de frontmatter y nueva validación de estructura del body.
- `panel-admin` — nueva capacidad de cargar/editar contenido completo de una skill.
- `servidor-mcp-escritura` — `publish_skill` acepta `content` opcional, validado igual que los
  otros dos caminos.

## Impact

- `src/lib/skills/validation.ts` — nuevo `SkillFrontmatterSchema`, nueva validación de secciones
  del body.
- `src/lib/skills/ingest.ts` — sigue igual en su mecánica, pero ahora valida contra el nuevo
  schema.
- `src/components/admin/SkillForm.tsx`, `src/lib/admin/skills.ts`, `src/app/admin/actions.ts` —
  nuevo flujo de carga de contenido completo.
- `src/lib/mcp/tools.ts` (`handlePublishSkill`), `src/lib/validations/mcp.ts`
  (`publishSkillMcpSchema`) — nuevo parámetro `content` opcional.
- Sin impacto en Prisma/schema (reusa `SkillVersion.files` del ítem #17), ni en Vercel/Neon.
