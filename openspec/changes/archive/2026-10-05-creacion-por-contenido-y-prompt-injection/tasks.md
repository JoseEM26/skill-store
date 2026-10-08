# Tasks

## 1. Filtro de prompt injection en el validador compartido (hacer primero, en solitario)

- [x] 1.1 En `src/lib/skills/validation.ts`, agregar `detectPromptInjectionPatterns(content:
      string): { detected: boolean; reason?: string }` con los patrones del ADR-0016: frases de
      anulación de instrucciones (español e inglés), instrucciones de exfiltrar secretos/env vars,
      comandos destructivos de shell literales (`rm -rf`, `DROP TABLE`, fork bomb, etc.),
      caracteres Unicode invisibles/zero-width, bloques base64 sospechosamente largos.
- [x] 1.2 Integrar esa función en `parseSkillMarkdown`, junto a la validación de frontmatter y de
      `validateSkillBodySections` ya existentes — si detecta un patrón, lanzar error con un
      mensaje genérico (sin revelar el patrón exacto que disparó el rechazo).
- [x] 1.3 Tests: contenido con frase de anulación de instrucciones se rechaza; contenido con
      instrucción de exfiltrar variables de entorno se rechaza; contenido con Unicode invisible se
      rechaza; contenido legítimo (ej. el template válido ya usado en tests anteriores) sigue
      validando OK sin falsos positivos.

## 2. Creación de skill por contenido completo (después del grupo 1)

- [x] 2.1 En `src/lib/admin/skills.ts`, agregar `createUserSkillContent(ownerId, content)`: parsea
      con `parseSkillMarkdown` (ya incluye el filtro del grupo 1), deriva `slug`/`name`/
      `description`/`license` del frontmatter, crea `Skill` + primera `SkillVersion` en una
      transacción (mismo patrón que `updateUserSkillContent`), reusando `ConflictError` si el
      slug ya existe para ese dueño.
- [x] 2.2 En `src/app/admin/actions.ts`, agregar `createSkillContentAction` (mismo patrón que
      `updateSkillContentAction`).
- [x] 2.3 En `src/components/admin/SkillForm.tsx`, hacer que el modo "contenido" funcione también
      para CREAR (hoy `handleSubmitContent` tiene `if (!initialData?.id) return;` bloqueando la
      creación — quitar ese bloqueo y llamar `createSkillContentAction` cuando no hay
      `initialData`). `repositoryUrl` deja de pedirse en el flujo de creación por contenido (sigue
      existiendo como campo editable aparte, no bloqueante).
- [x] 2.4 Tests: crear una skill nueva pegando contenido válido funciona sin pasar por el
      formulario de metadata; crear con un `name` que ya existe para ese dueño se rechaza con
      conflicto claro; crear con contenido inválido (frontmatter viejo, sección faltante, o
      patrón de prompt injection) se rechaza sin crear nada.

## 3. Verificación integral

- [x] 3.1 Ejecutar `pnpm test && pnpm build && pnpm lint` y verificar que no quede ningún test
      roto.
