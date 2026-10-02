# Design

## Context

Ver `proposal.md` y la revisión 2026-10-02 de ADR-0013
(`adrs/0013-cli-instalacion-interactiva.md`) para la decisión completa ya cerrada. El CLI
(`bin/skills-cli.ts`, `src/lib/cli/{client,commands,config}.ts`) y el ítem #17 ya existen y se
reutilizan tal cual.

## Goals / Non-Goals

**Goals:**
- Comando `tui` con navegación por teclado real, filtro en vivo, selección con Enter.
- Reusar `callMcpTool`/`handlePull`/`readStoredToken` existentes — cero lógica de fetch/auth
  duplicada.

**Non-Goals:**
- Rediseñar `list`/`search` en modo texto plano (siguen igual, para scripting/`--non-interactive`).
- Un dashboard multi-panel con preview de contenido — alcance de esta iteración es solo
  lista + filtro + selección, igual de ambicioso que lo pedido pero sin sumar paneles extra no
  pedidos.

## Decisions

### 1. Ink como motor de la TUI, no una reimplementación manual con ANSI crudo
- **Decisión:** `ink` (+ `ink-text-input` para el campo de filtro).
- **Razón:** el proyecto ya depende de `react`; Ink es "React para terminales", mismo modelo
  mental ya conocido en el repo. Reimplementar manejo de modo raw, redibujado y navegación por
  teclado a mano sería reinventar exactamente lo que Ink ya resuelve.

### 2. Un solo componente, estado simple con `useState`/`useEffect`
- **Decisión:** `src/lib/cli/tui.tsx` exporta un componente `SkillsTui` que carga la lista al
  montar (reusando `handleListOrSearch` o `callMcpTool` directo), mantiene `filterText` y
  `selectedIndex` en estado local, y llama `handlePull` al confirmar.
- **Razón:** el alcance (una lista navegable con filtro) no justifica un store externo ni
  bubbletea-style "Elm architecture" formal — `useState` alcanza.

### 3. `tui` es un comando nuevo, no reemplaza `list`/`search`
- **Decisión:** `bin/skills-cli.ts` gana un caso `tui` que monta `<SkillsTui />` con
  `ink`'s `render()`; `list`/`search` quedan intactos para uso no interactivo/scripting.
- **Razón:** separar la superficie "para humanos en una terminal real" de la superficie "para
  scripts/otros programas" evita que un cambio de UX rompa un pipeline que parseaba la salida de
  texto plano de `list`.

## Risks / Trade-offs

- [Ink requiere un TTY real; en CI o pipes se rompe] → Aceptado, `tui` es explícitamente para uso
  interactivo humano; scripting sigue usando `list`/`search`/`pull` directos.
- [Primera dependencia de UI nueva en el CLI] → Aceptado, documentado en la revisión de ADR-0013
  con la razón concreta (reproducir una TUI real a mano no es viable en pocas líneas).
