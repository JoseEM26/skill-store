# ADR 0014: Formato estricto de skill, gestión del catálogo propio y carga de contenido

## Estado

Aceptado (implementado como ítem #18 del backlog)

## Contexto

El registro es una comunidad: cada usuario debe poder gestionar su propio catálogo (skills
propias/agentes personalizados, públicos o privados — ya implementado en el ítem #16) y subir
contenido de dos formas: (a) vía MCP, desde su propio agente de IA, y (b) manualmente, a través del
panel admin. Hoy ninguna de las dos formas acepta el **contenido real** de una skill — el panel
(`SkillForm.tsx`) solo gestiona metadata suelta (`name`, `description`, `license`,
`repositoryUrl`), y `publish_skill` (MCP) tampoco acepta contenido, solo esos mismos campos. El
contenido completo (`SkillVersion.files`, agregado en el ítem #17) hoy solo se llena desde la
ingesta de GitHub Action — exactamente la limitación que ADR-0013 dejó explícita como Non-Goal
("No soportar `publish_skill` con contenido de archivos vía MCP").

Además, no existe ninguna plantilla/formato obligatorio para el cuerpo de una skill — cada una de
las 13 skills de ejemplo tiene su propia estructura libre. El usuario quiere que, de ahora en más,
toda skill nueva (sea por git+Action, panel o MCP) se valide estrictamente contra una única
plantilla.

## Decisión

1. **Plantilla única y estricta de skill**, aplicada igual en los tres caminos de publicación
   (ingesta de GitHub Action, panel, MCP):
   - **Frontmatter YAML** (reemplaza el schema plano actual en
     `src/lib/skills/validation.ts`):
     ```yaml
     ---
     name: nombre-de-la-skill
     description: Explicación concisa de qué hace la skill, qué dominios cubre y cuándo debe
       activarla el agente de IA.
     license: MIT
     compatibility: "Claude Code, OpenAI Codex, Cursor >= 0.40"
     metadata:
       version: "1.0.0"
       author: "Tu Nombre"
     ---
     ```
     Campos obligatorios: `name`, `description`, `license`, `compatibility`, `metadata.version`
     (SemVer), `metadata.author`. `repository`/`repositoryUrl` deja de ser parte del frontmatter
     obligatorio — sigue existiendo como campo separado de `Skill` (ya en el modelo), seteable
     opcionalmente desde el panel/MCP sin forzarlo dentro del YAML.
   - **Cuerpo con 6 secciones obligatorias** (como headings `## N. <Título>`, en este orden):
     1. Propósito y Cuándo Usar
     2. Flujo de Trabajo (Workflow)
     3. Reglas y Restricciones (Criterios de Diseño)
     4. Árbol de Decisión (Si aplica — el contenido puede decir "No aplica", pero el heading debe
        existir)
     5. Ejemplos Ejecutables
     6. Manejo de Errores y Casos Excepcionales
2. **Validador compartido único** (`src/lib/skills/validation.ts`, extendiendo lo ya implementado
   para el ítem #4/#17) usado por los tres caminos de publicación — no se reimplementa la
   validación en cada lugar.
3. **Panel: carga manual de contenido completo.** Nueva opción en `/admin/skills` para pegar/editar
   el markdown completo (frontmatter + body) de una skill, validado contra la plantilla antes de
   guardarse como `SkillVersion.files` (`{"SKILL.md": contenido}`), parseando el frontmatter para
   poblar también los campos de `Skill` (igual que ya hace la ingesta de GitHub Action).
4. **MCP: `publish_skill` acepta contenido completo.** Nuevo parámetro opcional `content` (el
   markdown completo); cuando se provee, se valida contra la misma plantilla y se guarda en
   `files`, derivando `name`/`description`/`license`/`metadata` del frontmatter (mismo
   comportamiento que el panel). Si no se provee `content`, `publish_skill` sigue funcionando como
   hoy (solo metadata, sin contenido) — no rompe el flujo existente.
5. **Las 13 skills de ejemplo y su formato actual no se migran retroactivamente** — la plantilla
   estricta aplica solo a publicaciones nuevas desde este ADR en adelante (mismo criterio ya usado
   en ADR-0013 para el campo `files`).

## Alternativas consideradas

- **Mantener el frontmatter plano actual (`version`/`author`/`repository` sueltos) y solo agregar
  la validación de secciones del body** — se descarta: el usuario pidió explícitamente el formato
  con `compatibility` y `metadata` anidado, no el formato viejo.
- **Validación "suave" (solo advertencia, no bloqueo)** — se descarta: el usuario pidió que se
  "guíen estrictamente", es decir, rechazo si no cumple, no solo un aviso.
- **Forzar re-publicación de las 13 skills de ejemplo contra el nuevo formato** — se descarta por
  alcance; es trabajo aparte si se decide hacerlo, no bloqueante para esta decisión.

## Consecuencias

- Cambia el schema de frontmatter esperado por `src/lib/skills/validation.ts` — rompe la validación
  de cualquier `SKILL.md` nuevo que use el formato viejo (plano). Las skills ya ingeridas no se
  revalidan retroactivamente.
- `src/lib/admin/skills.ts` y `SkillForm.tsx` ganan un flujo nuevo (carga de contenido completo)
  sin romper el flujo existente de edición de metadata suelta.
- `publish_skill` (MCP) gana un parámetro opcional — compatible hacia atrás con clientes que
  todavía no manden `content`.
- No resuelve el modelo de licencia por skill (sigue abierto, ver PRD.md → Historial de cambios).

## Revisión 2026-10-05: `license`/`compatibility`/`metadata.author` dejan de ser obligatorios

En uso real, exigir `license`, `compatibility` y `metadata.author` en cada publicación resultó
fricción innecesaria para el caso común (una skill personal, de uso rápido) — el usuario reportó
el error de validación y pidió sacarlos.

- **Decisión:** en `SkillFrontmatterSchema` (`src/lib/skills/validation.ts`):
  - `license` pasa a ser opcional, con default `"MIT"` si se omite (mismo default que ya usa
    `createUserSkill`/`updateUserSkill` en el resto del panel cuando no se especifica).
  - `compatibility` pasa a ser opcional, sin valor inventado si se omite (queda `undefined`/sin
    mostrar, no un placeholder falso).
  - `metadata.author` pasa a ser opcional — si se omite, el llamador (panel/MCP, que ya conoce al
    dueño autenticado) puede completar con el `username` real en vez de inventar un valor.
  - `metadata.version` **sigue siendo obligatorio** — no se relaja: es estructuralmente necesario
    para crear la `SkillVersion` (SemVer), no es un dato decorativo como los otros tres.
- **Razón:** `license`/`compatibility`/`author` son metadata informativa, no crítica para que el
  sistema funcione; `version` sí lo es (sin versión no hay a qué `SkillVersion` asociar el
  contenido). Relajar todo el schema (incluyendo `version`) habría roto el modelo de versionado.
- **Alcance fuera de esta revisión:** no se toca la validación de las 6 secciones del body
  (`validateSkillBodySections`) ni el filtro de prompt injection — el usuario solo pidió sacar la
  fricción del frontmatter, no bajar el estándar de estructura/seguridad del contenido.

## Revisión 2026-10-05 (continuación): `metadata.version` deja de ser obligatorio, y las 6
## secciones del body dejan de bloquear la publicación

En uso real con una skill propia de un proyecto existente (`aybar-cqrs`, un resumen técnico con
frontmatter de solo `name`/`description` y cuerpo en formato libre: encabezado + bullets, sin
`metadata` ni las 6 secciones numeradas), el usuario volvió a chocar con el validador — primero
con "El campo metadata es obligatorio (falta la versión)" y, de haberse resuelto eso, hubiera
chocado después con la validación de estructura del body. Pidió explícitamente que sea "un poco
más libre, no tan estricto".

Esto revierte dos cosas que la revisión anterior (arriba) y el ADR original habían dejado
explícitamente fuera de alcance / como obligatorias:

- **`metadata.version` pasa a ser opcional**, con default `"1.0.0"` si se omite (mismo patrón ya
  usado para `license`). Si se provee un valor, se sigue validando que sea SemVer válido (error
  claro si no lo es); si se omite directamente (o se omite `metadata` entero), se usa el default
  sin error. Esto significa que `metadata` en sí deja de ser un bloque obligatorio — con
  `name`/`description` alcanza para que el frontmatter sea válido.
- **La validación de las 6 secciones obligatorias del body (`validateSkillBodySections`) deja de
  bloquear la publicación.** `parseSkillMarkdown` ya no llama a esa función como paso que puede
  tirar error — cualquier contenido de body (markdown libre, sin esas 6 secciones ni ese orden) es
  aceptado. La función y `REQUIRED_SKILL_SECTIONS` quedan en el código (no se borran, por si se
  reusan en el futuro como sugerencia no bloqueante), pero no se invocan en el camino de
  validación real.
- **El filtro de prompt injection (ADR-0016) NO se toca** — sigue aplicando igual, en los tres
  caminos de publicación. Esto es específicamente sobre estructura/formato, no sobre contenido
  malicioso.

- **Razón:** en la práctica, exigir una plantilla rígida de 6 secciones + metadata anidada
  resultó ser fricción real y repetida para el caso más común — una skill personal que documenta
  un patrón o decisión técnica ya existente, no escrita desde cero siguiendo la plantilla. El
  sistema sigue funcionando igual de bien con contenido libre: `name`/`description`/`version`
  (con default) son los únicos datos que el modelo de datos realmente necesita.
- **Alternativas consideradas:** mantener la validación de secciones como advertencia no
  bloqueante (mostrar un aviso pero permitir publicar igual) — se descarta por ahora para no
  sumar una UI de "warnings" nueva; se opta por simplemente no bloquear, que es el pedido
  explícito del usuario ("más libre").
- **Consecuencia aceptada:** el catálogo va a tener skills con estructuras de body heterogéneas
  de acá en adelante (algunas con las 6 secciones, otras en formato libre) — se acepta este
  costo de consistencia a cambio de menor fricción de publicación.
