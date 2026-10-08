# Proposal

## Why

Crear una skill nueva desde el panel obliga a pasar primero por un formulario de metadata suelta
(incluyendo `repositoryUrl`, que ni es parte del frontmatter estricto de ADR-0014); recién con la
skill ya creada se puede pegar el `.md` completo. Además, una skill es un conjunto de
instrucciones que un agente de IA va a leer y seguir al instalarla — hoy no hay ningún filtro
contra contenido con prompt injection.

## What Changes

- Pegar el `.md` completo pasa a ser la forma principal de crear una skill nueva en el panel (no
  solo de editar una existente), validado y derivado por el mismo `parseSkillMarkdown` compartido.
- `repositoryUrl` deja de ser parte bloqueante del flujo de creación — campo opcional aparte.
- Nuevo filtro heurístico de prompt injection en el validador compartido
  (`src/lib/skills/validation.ts`), aplicado en los tres caminos de publicación (ingesta, panel,
  MCP): rechaza frases de anulación de instrucciones, instrucciones de exfiltrar
  secretos/variables de entorno, comandos destructivos de shell literales, Unicode invisible, y
  bloques base64 sospechosos.

## Capabilities

### Modified Capabilities
- `panel-admin` — nuevo flujo de creación de skill por contenido completo.
- `skill-ingestion` — nueva validación de prompt injection, aplicada junto a la de frontmatter/
  estructura ya existente (ADR-0014), en los tres caminos de publicación.

## Impact

- `src/lib/skills/validation.ts` — nueva función de detección de patrones de prompt injection,
  integrada a `parseSkillMarkdown`/`validateSkillFile`.
- `src/lib/admin/skills.ts` — nueva función de creación por contenido (ej.
  `createUserSkillContent`), espejo de `updateUserSkillContent` ya existente.
- `src/components/admin/SkillForm.tsx`, `src/app/admin/actions.ts` — el modo "contenido" deja de
  requerir una skill ya creada; `repositoryUrl` pasa a ser un campo opcional separado.
- Sin impacto en MCP más allá de que `publish_skill` con `content` ahora también pasa por el nuevo
  filtro (mismo validador compartido, sin tocar `handlePublishSkill` en sí).
- Sin impacto en Prisma/schema, CLI, ni Vercel/Neon.
