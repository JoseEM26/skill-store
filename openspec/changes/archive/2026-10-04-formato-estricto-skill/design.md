# Design

## Context

Ver `proposal.md` y ADR-0014 (`adrs/0014-formato-estricto-de-skill-y-gestion-propia.md`) para la
decisión completa ya cerrada. El validador actual de frontmatter vive en
`src/lib/skills/validation.ts` (`SkillFrontmatterSchema`, usado por la ingesta de GitHub Action
desde el ítem #4). `SkillVersion.files` ya existe (ítem #17).

## Goals / Non-Goals

**Goals:**
- Un único validador (frontmatter nuevo + estructura de body) reusado por los tres caminos de
  publicación.
- Panel: nueva opción para cargar contenido completo de una skill propia.
- MCP: `publish_skill` acepta `content` opcional, compatible hacia atrás.

**Non-Goals:**
- Migrar retroactivamente las 13 skills de ejemplo al nuevo formato.
- Resolver el modelo de licencia por skill (sigue abierto).
- Editor de markdown con preview visual en el panel — un `<textarea>` simple alcanza para esta
  iteración; una UI más rica es una mejora futura, no bloqueante.

## Decisions

### 1. `SkillFrontmatterSchema` se reemplaza, no se extiende con campos opcionales
- **Decisión:** el schema Zod pasa a exigir `name`, `description`, `license`, `compatibility`,
  `metadata.version` (SemVer), `metadata.author`. `version`/`author`/`repository` sueltos dejan de
  ser válidos como campos de nivel superior.
- **Razón:** el usuario pidió este formato exacto, explícitamente. Mantener ambos schemas en
  paralelo (viejo y nuevo) sería ambigüedad innecesaria — las skills ya ingeridas no se revalidan,
  así que no hay necesidad de aceptar el formato viejo para contenido nuevo.

### 2. Validación de estructura de body: búsqueda de headings exactos, no un parser Markdown completo
- **Decisión:** validar la presencia y el orden de las 6 líneas de heading exactas (`## 1.
  Propósito y Cuándo Usar`, etc.) con una regex/búsqueda de línea, no con un AST de Markdown.
- **Razón:** más simple, sin dependencia nueva (ya existe `gray-matter` para el frontmatter); la
  tolerancia a variaciones menores de redacción dentro de cada sección no importa, solo que los 6
  headings estén presentes y en orden.

### 3. `content` en `publish_skill` es la fuente de verdad cuando se provee
- **Decisión:** si `content` viene en la llamada a `publish_skill`, los campos
  `name`/`description`/`license` derivados del frontmatter tienen prioridad sobre cualquier campo
  suelto que también se haya mandado (si hay conflicto, gana el frontmatter del `content`).
- **Razón:** evita estados inconsistentes entre "lo que dice el frontmatter" y "lo que dicen los
  parámetros sueltos" — mismo criterio que ya usa la ingesta de GitHub Action (el frontmatter
  siempre manda).

### 4. Panel: reusa el mismo validador compartido, no reimplementa reglas
- **Decisión:** el nuevo flujo de carga de contenido en `SkillForm`/`src/lib/admin/skills.ts` llama
  a la misma función de `src/lib/skills/validation.ts` que usan la ingesta y el MCP.
- **Razón:** única fuente de verdad para "qué es una skill válida" — evita que los tres caminos
  diverjan con el tiempo.

## Risks / Trade-offs

- [Cualquier `SKILL.md` externo que alguien tuviera preparado con el formato viejo dejará de
  validar] → Aceptado, es la intención explícita del cambio; el mensaje de error debe ser claro
  sobre qué cambió.
- [El `<textarea>` simple en el panel no da feedback de validación en vivo mientras se escribe,
  solo al guardar] → Aceptado para esta iteración; mejorar la UX del editor es trabajo futuro.
