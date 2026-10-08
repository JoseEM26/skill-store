# Proposal

## Why

Con catálogos reales, el comando `tui` lista todas las skills de una sin límite, lo que desborda
el panel de la terminal y hace incómodo navegar. Además solo permite traer una skill a la vez.

## What Changes

- La lista del `tui` pasa a ser una ventana deslizante de 5 ítems visibles a la vez (no todas de
  una), con un indicador de posición (ej. "3-7 de 23").
- Selección múltiple con la tecla Tab (toggle sobre el ítem resaltado); Enter trae todos
  los ítems marcados — si ninguno fue marcado, Enter sigue trayendo solo el resaltado
  (compatibilidad con el comportamiento actual).

## Capabilities

### Modified Capabilities
- `cli-instalacion` — el comportamiento de `tui` cambia (ventana deslizante + selección múltiple),
  sin afectar `list`/`search`/`pull` en modo texto plano.

## Impact

- `src/lib/cli/tui.tsx` — ventana deslizante sobre la lista filtrada, estado de selección múltiple
  (`Set<string>` de owner/slug marcados), `useInput` extendido para la tecla Tab.
- `src/lib/cli/commands.ts` — `handlePull` ya acepta un identificador por llamada; el `tui` lo
  invoca una vez por ítem marcado, sin cambiar su firma.
- Sin impacto en el servidor, Prisma, ni MCP.
