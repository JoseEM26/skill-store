# Design

## Context

Ver `proposal.md` y la revisión 2026-10-04 de ADR-0013 (sección "Revisión 2026-10-04: paginación y
selección múltiple en `tui`"). El `tui` ya existe (`src/lib/cli/tui.tsx`), construido con Ink.

## Goals / Non-Goals

**Goals:**
- Ventana deslizante de 5 ítems visibles, indicador de posición.
- Selección múltiple con Tab, pull en lote con Enter.

**Non-Goals:**
- Filtros estructurados adicionales (por visibilidad, por dueño) — pedido ambiguo, fuera de
  alcance de esta revisión.
- Paginación por número de página con click — se usa ventana deslizante continua, más simple.

## Decisions

### 1. Ventana deslizante calculada desde `selectedIndex`, no estado de "página" separado
- **Decisión:** `windowStart = clamp(selectedIndex - 2, 0, filteredSkills.length - 5)` (o
  equivalente), renderizando `filteredSkills.slice(windowStart, windowStart + 5)`.
- **Razón:** evita mantener un estado de "página actual" sincronizado a mano con el índice
  seleccionado; se deriva directamente de él.

### 2. Selección múltiple como `Set<string>` de claves `owner/slug`
- **Decisión:** nuevo estado `selectedKeys: Set<string>`, toggle con la tecla Tab sobre el
  ítem resaltado. Al presionar Enter: si `selectedKeys.size > 0`, pull de cada uno en
  `selectedKeys`; si está vacío, pull solo del ítem resaltado (compatibilidad con el
  comportamiento actual).
- **Razón:** mantiene compatible el flujo de un solo ítem (el más común) sin requerir que el
  usuario marque nada si solo quiere traer uno.

## Risks / Trade-offs

- [Pull en lote es secuencial, no paralelo] → Aceptado para esta iteración; son operaciones de
  archivo locales + una llamada HTTP cada una, no hay necesidad de paralelizar para el volumen
  esperado.
