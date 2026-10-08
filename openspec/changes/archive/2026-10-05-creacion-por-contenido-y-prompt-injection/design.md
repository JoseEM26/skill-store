# Design

## Context

Ver `proposal.md` y ADR-0016 (`adrs/0016-creacion-por-contenido-y-filtro-prompt-injection.md`)
para la decisión completa ya cerrada. Reusa `parseSkillMarkdown` (ADR-0014) y
`updateUserSkillContent` (ítem #18) como referencia de patrón.

## Goals / Non-Goals

**Goals:**
- Crear una skill nueva pegando el `.md` completo, sin pasar por metadata suelta primero.
- `repositoryUrl` opcional, no bloqueante.
- Filtro heurístico de prompt injection en el validador compartido, aplicado a los 3 caminos.

**Non-Goals:**
- Revisión con LLM (queda como mejora futura, ver Alternativas del ADR).
- Cola de moderación manual.
- Tocar `handlePublishSkill` en sí — el filtro vive en `parseSkillMarkdown`, que ya es llamado
  desde ahí cuando se manda `content`.

## Decisions

### 1. Nueva función `createUserSkillContent`, espejo de `updateUserSkillContent`
- **Decisión:** `src/lib/admin/skills.ts` gana `createUserSkillContent(ownerId, content)` que
  parsea con `parseSkillMarkdown`, deriva `slug`/`name`/`description`/`license` del frontmatter, y
  crea `Skill` + primera `SkillVersion` en una transacción — mismo patrón que
  `updateUserSkillContent`, pero `create` en vez de `update`. Reusa el mismo `ConflictError` ya
  existente si el slug/name ya está en uso por ese dueño.
- **Razón:** evita duplicar lógica de parseo/validación; solo cambia la operación final de
  Prisma (create vs update).

### 2. El filtro de prompt injection es una función pura, testeable en aislamiento
- **Decisión:** nueva función en `src/lib/skills/validation.ts` (ej.
  `detectPromptInjectionPatterns(content: string): { detected: boolean; reason?: string }`),
  llamada desde `parseSkillMarkdown` junto a la validación de frontmatter/estructura ya existente.
- **Razón:** mismo criterio que `validateSkillBodySections` — una función enfocada, fácil de
  testear con casos concretos, sin acoplarse al resto del parseo.

### 3. Patrones heurísticos como regex simples, sin dependencia nueva
- **Decisión:** lista de regex/patrones de texto (frases de anulación, keywords de
  exfiltración + env vars, comandos destructivos literales, rangos Unicode de ancho cero, bloques
  base64 largos vía regex de caracteres base64 de más de N caracteres contiguos).
- **Razón:** no hace falta ninguna librería nueva ni un servicio externo para esta primera
  versión — son chequeos de texto determinísticos.

### 4. Mensaje de error genérico, sin revelar la regla exacta
- **Decisión:** el error dice algo como "El contenido fue rechazado por contener un patrón
  asociado a instrucciones maliciosas (prompt injection). Revisá el contenido y volvé a
  intentarlo.", sin especificar cuál de las reglas exactas disparó el rechazo.
- **Razón:** un mensaje que dice exactamente "se detectó la frase X" facilita evadir el filtro
  reescribiendo solo esa frase; un mensaje genérico sigue siendo útil para un usuario legítimo que
  tuvo un falso positivo (puede revisar todo su contenido) sin regalarle el patrón exacto a un
  atacante.

## Risks / Trade-offs

- [Falsos positivos en contenido legítimo que mencione comandos destructivos como ejemplo de qué
  NO hacer] → Aceptado, documentado en el ADR; si se vuelve un problema real en la práctica, se
  revisa el enfoque (ver Alternativas del ADR).
- [Un atacante decidido puede ofuscar el contenido para evadir regex simples] → Aceptado para esta
  versión; es una primera barrera, no una garantía — documentado explícitamente como limitación
  conocida, no se vende como solución completa.
