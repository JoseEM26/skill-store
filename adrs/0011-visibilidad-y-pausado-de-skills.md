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
