# Tasks

## 1. Validador compartido (hacer primero, en solitario — todo lo demás depende de esto)

- [x] 1.1 Reemplazar `SkillFrontmatterSchema` en `src/lib/skills/validation.ts` por el nuevo
      schema (`name`, `description`, `license`, `compatibility`, `metadata.version` SemVer,
      `metadata.author`), actualizando `ParsedSkill`/tipos derivados según haga falta.
- [x] 1.2 Agregar una función de validación de estructura del body (6 headings exactos en orden:
      "## 1. Propósito y Cuándo Usar", "## 2. Flujo de Trabajo (Workflow)", "## 3. Reglas y
      Restricciones (Criterios de Diseño)", "## 4. Árbol de Decisión (Si aplica)", "## 5. Ejemplos
      Ejecutables", "## 6. Manejo de Errores y Casos Excepcionales"), con mensajes de error
      específicos (qué sección falta o está fuera de orden).
- [x] 1.3 Actualizar `src/lib/skills/ingest.ts`/`scripts/ingest-skills.ts` para seguir funcionando
      con el nuevo schema (ya reusan `validateSkillFile`/`parseSkillMarkdown`, confirmar que no
      hace falta tocar nada más ahí salvo lo que el nuevo schema requiera). Actualizar los 13
      `SKILL.md` de ejemplo NO es parte de esta tarea — se quedan como están (formato viejo,
      documentado como limitación aceptada en el ADR).
- [x] 1.4 Tests: un `SKILL.md` con el frontmatter y las 6 secciones completas valida OK; uno con el
      frontmatter viejo (plano) falla con mensaje claro; uno al que le falta una sección falla
      señalando cuál; uno con las secciones fuera de orden falla señalando el problema de orden.

## 2. Panel: carga de contenido completo (en paralelo con el grupo 3, después del grupo 1)

- [x] 2.1 Agregar en `src/lib/admin/skills.ts` una función (ej. `updateUserSkillContent` o
      extender `updateUserSkill`) que reciba el markdown completo, lo valide con el validador
      compartido del grupo 1, y si es válido guarde `SkillVersion.files` + actualice
      `name`/`description`/`license` de `Skill` desde el frontmatter — respetando ownership (igual
      patrón que el resto de `admin/skills.ts`) y que no se pueda tocar una skill archivada.
- [x] 2.2 Agregar en `SkillForm.tsx` (o un componente nuevo específico) un `<textarea>` para pegar/
      editar el contenido completo, con los errores de validación mostrados claramente si falla.
- [x] 2.3 Tests: carga de contenido válido guarda `files` y actualiza metadata; contenido inválido
      se rechaza mostrando el error específico sin guardar nada; un usuario no puede cargar
      contenido en una skill que no es suya.

## 3. MCP: publish_skill con contenido (en paralelo con el grupo 2, después del grupo 1)

- [x] 3.1 Agregar `content` opcional a `publishSkillMcpSchema` (`src/lib/validations/mcp.ts`) y a
      `handlePublishSkill` (`src/lib/mcp/tools.ts`): si se provee, validar con el validador
      compartido del grupo 1, derivar `name`/`description`/`license` del frontmatter (con
      prioridad sobre campos sueltos si hay conflicto), y guardar en `SkillVersion.files`. Si no
      se provee, mantener el comportamiento actual sin cambios.
- [x] 3.2 Tests: publish_skill con `content` válido guarda `files` y deriva metadata; con
      `content` inválido se rechaza sin crear/modificar nada; sin `content` sigue funcionando
      igual que antes (regresión); otro dueño no puede publicar contenido para una skill ajena.

## 4. Verificación integral

- [x] 4.1 Ejecutar `pnpm test && pnpm build && pnpm lint` con todos los cambios integrados y
      verificar que no quede ningún test roto.
