# ADR 0011: Visibilidad pública/privada y pausado de skills

## Estado

Aceptado (implementado como ítem #16 del backlog)

## Contexto

El PRD original (ver PRD.md → Historial de cambios, 2026-10-01) solo contemplaba visibilidad
pública/privada para `Context` de tipo `idea`; las skills se asumían siempre públicas, sin opción
de ocultarlas ni de "pausarlas" sin borrarlas. Al usar el registro en la práctica, el dueño de una
skill necesita dos controles que hoy no existen:

1. Decidir si una skill es visible para toda la comunidad o solo para él (igual que ya puede hacer
   con sus ideas).
2. Ocultar temporalmente una skill del catálogo activo sin perder su historial de versiones ni sus
   contadores, y poder revertirlo — distinto del archivado automático e irreversible por el usuario
   que ya existe para cuando se borra la cuenta (ADR heredado del PRD, ítem #13 del backlog).

## Decisión

- Agregar `isPublic: Boolean` (default `true`, para no cambiar el comportamiento de las skills ya
  publicadas) al modelo `Skill`, con la misma semántica que ya tiene `Context.isPublic`: una skill
  privada solo es visible/gestionable por su dueño (panel y su propio MCP), excluida de
  `list_skills`/`search_skills` sin token y del catálogo público.
- Agregar `isPaused: Boolean` (default `false`) al modelo `Skill`: una skill pausada se oculta del
  catálogo activo y no es instalable desde ahí, pero conserva versiones, contadores y es
  reversible por el propio dueño en cualquier momento — a diferencia de `isArchived`, que es
  irreversible por el usuario y solo lo dispara el sistema al borrar/revocar la cuenta.
- El control de ambos campos debe ser idéntico sin importar si la skill se publica/edita desde el
  panel web o desde las tools MCP `publish_skill`/`update_skill` — ninguno de los dos caminos debe
  ser más permisivo que el otro.
- Al eliminar una skill (borrado definitivo, no pausado), mostrar una advertencia previa cuyo texto
  depende de `isPublic` en ese momento: si es/era pública, aclarar que quienes ya la descargaron o
  instalaron conservan su copia local (el registro no puede revocar copias ya distribuidas); si
  es/era privada, aclarar que no hay copias de terceros que considerar.

## Alternativas consideradas

- **Un solo campo de "estado" (enum: public/private/paused/archived) en vez de tres booleanos** —
  más compacto, pero mezcla dos ejes independientes (visibilidad y disponibilidad temporal) en un
  solo valor, y complica queries que hoy ya filtran por `isArchived` solo (ítems #5, #9, #11, #13
  ya implementados) — se descarta para no tener que migrar esa lógica ya probada.

## Consecuencias

- Requiere una migración de Prisma (dos columnas nuevas con default, no rompe filas existentes).
- Las queries del catálogo público (`src/lib/catalog/queries.ts`, ítem #5) y las tools MCP de
  lectura (ítem #9) necesitan sumar `isPublic: true, isPaused: false` a sus filtros, igual que ya
  filtran `isArchived: false` — cambio mecánico, mismo patrón ya usado para `Context`.
- No resuelve el modelo de licencia (qué puede hacer un tercero con una skill ya instalada) — eso
  queda como pregunta abierta en PRD.md → Historial de cambios, independiente de esta decisión.

## Revisión 2026-10-05: `isPublic` ausente del formulario de creación/edición (`SkillForm`)

El usuario reportó que en `/admin/skills` "no puede hacerse o editar si es público o privado la
skill". Al revisar: el control de visibilidad SÍ existe (`SkillList.tsx`, botón "Hacer
privada"/"Hacer pública" por fila, ya implementado en esta misma ADR), pero **vive separado del
formulario de creación/edición** (`SkillForm.tsx`) — ni el modo "Metadatos" ni el modo "Cargar
Contenido" (este último agregado por ADR-0016, y que desde esa revisión es el flujo *principal* de
creación) tienen ningún campo para elegir `isPublic` al crear, ni para cambiarlo al editar. Como
consecuencia, toda skill nueva creada por el flujo de contenido nace pública por el default de
Postgres (`isPublic @default(true)`) sin que el usuario lo haya decidido explícitamente, y cambiar
eso requiere salir del formulario y usar el botón aparte en la lista — no es obvio que ese botón
exista ni que sea la forma de hacerlo.

- **Decisión:** `SkillForm.tsx` gana un control de visibilidad (checkbox o toggle "Pública"/
  "Privada", visible en AMBOS modos — Metadatos y Cargar Contenido, tanto al crear como al
  editar), con default `true` (pública) al crear, para no cambiar el comportamiento actual.
  - Modo Metadatos: ya es trivial — `createSkillSchema`/`updateSkillSchema` y
    `createSkillAction`/`updateSkillAction` ya aceptan `isPublic` opcional, solo falta el campo en
    el form.
  - Modo Cargar Contenido: hoy `createSkillContentSchema`/`updateSkillContentSchema`
    (`src/lib/validations/skill.ts`) NO tienen `isPublic` en absoluto. Hay que agregarlo como
    campo opcional ahí, propagarlo a `createSkillContentAction`/`updateSkillContentAction`
    (`src/app/admin/actions.ts`) y a `createUserSkillContent`/`updateUserSkillContent`
    (`src/lib/admin/skills.ts`), para que el `tx.skill.create`/`tx.skill.update` reciba
    `isPublic` explícitamente en vez de depender solo del default de Postgres.
- **Razón:** el control ya existía a nivel de dato y de una UI aislada, pero estaba desconectado
  del punto donde el usuario realmente toma la decisión (crear/editar la skill) — es un defecto de
  descubribilidad/UX, no una funcionalidad nueva.
- **Alcance fuera de esta revisión:** `isPaused` NO se agrega al formulario — pausar/reanudar ya
  tiene su propio botón dedicado en `SkillList.tsx` y no es una decisión que tenga sentido tomar en
  el momento de *crear* una skill nueva (nace siempre activa); el pedido del usuario fue
  específicamente sobre público/privado.

## Revisión 2026-10-07: toda skill creada por un camino automático del sistema nace privada

El usuario pidió que cualquier skill creada "por el sistema" — es decir, por un camino
*automático*, sin que un humano haya decidido explícitamente la visibilidad en el panel — nazca
siempre privada, sin importar de quién sea el dueño ni qué parámetro se haya mandado. Recién
después, el dueño la hace pública manualmente desde el panel (`/admin/skills`, el checkbox ya
implementado en la revisión anterior de esta misma ADR).

Hoy hay dos caminos "automáticos" de creación de skills (además del panel, que ya es manual por
definición y queda fuera de esta revisión):

1. **`publish_skill` vía MCP** (`handlePublishSkill`, `src/lib/mcp/tools.ts`): en la rama de
   creación (`prisma.skill.create`, sin `data.id`), hoy usa `isPublic: data.isPublic ?? true` — si
   el cliente MCP no manda `isPublic`, nace pública; y si lo manda en `true`, también nace pública
   de inmediato, sin pasar por el panel.
2. **Ingesta de GitHub Action** (`ingestSkill`, `src/lib/skills/ingest.ts`): en la rama de
   creación (`tx.skill.create`, cuando `!existingSkill`), hoy ni siquiera setea `isPublic`,
   dependiendo del default de Postgres (`@default(true)`) — nace pública siempre.

- **Decisión:**
  - En `handlePublishSkill` (MCP), la rama de **creación** de una skill nueva fuerza
    `isPublic: false` de forma incondicional — **se ignora** cualquier valor de `data.isPublic`
    que mande el cliente MCP al crear. La rama de **actualización** (`data.id` presente, skill ya
    existente) NO se toca: sigue respetando `data.isPublic` si se manda explícitamente, que es
    precisamente el camino para que el dueño (vía su propio cliente MCP, o el botón del panel, o
    el checkbox de `SkillForm`) decida hacerla pública después, deliberadamente.
  - En `ingestSkill` (ingesta de GitHub Action), la rama de **creación** (`!existingSkill`) agrega
    explícitamente `isPublic: false` al `tx.skill.create` (en vez de depender del default de
    Postgres). La rama de actualización de una skill ya existente (nueva versión) no se toca — no
    vuelve a tocar `isPublic` en absoluto, conservando el valor que ya tenía.
  - El formulario del panel (`SkillForm.tsx`, revisión anterior) **no se toca** — sigue siendo el
    único camino de creación verdaderamente manual, con el checkbox visible y default `true`
    (una persona decidiendo activamente, con la skill completa a la vista, es distinto de un
    agente o un pipeline de CI creando algo sin supervisión humana en el momento).
- **Razón:** una skill que entra al sistema sin que un humano haya mirado el panel todavía
  (publicada por un agente de IA de un tercero vía MCP, o por un pipeline de CI) es contenido no
  revisado — exponerlo públicamente de inmediato es el escenario de riesgo que esta revisión
  cierra. Forzar privado en el momento de creación automática, y dejar "hacerla pública" como un
  acto deliberado posterior (vía panel), es el mismo patrón de "privado por defecto, público por
  decisión explícita" que ya rige para `Context` de tipo `idea`.
- **Alcance fuera de esta revisión:** no se toca `isPaused` en ninguno de los dos caminos (sigue
  en su default `false`, una skill recién creada no nace pausada). No se restringe la
  actualización de `isPublic` vía MCP para skills ya existentes — solo la creación de una skill
  nueva se fuerza a privada.
