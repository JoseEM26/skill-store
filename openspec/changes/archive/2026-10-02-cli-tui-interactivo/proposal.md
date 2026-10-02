# Proposal

## Why

El selector interactivo actual de `skills list`/`search` (lista numerada + escribir un número vía
`readline/promises`) se siente pobre comparado con una TUI real de pantalla completa. El usuario
pidió explícitamente algo al nivel de `engram tui` (navegación por flechas, panel con bordes,
filtro en vivo) para el CLI de este registro.

## What Changes

- Nuevo comando `tui` en el CLI (`pnpm cli tui`): dashboard interactivo de pantalla completa
  construido con Ink (React para terminales) — lista navegable con flechas (↑/↓ o j/k), filtro en
  vivo por texto, Enter trae (`pull`) la skill seleccionada, Esc/`q` para salir.
- Nueva dependencia: `ink` (el proyecto ya depende de `react`, que Ink reusa).
- `list`/`search` en modo no interactivo (sin TTY o con `--non-interactive`) no cambian — siguen
  siendo salida de texto plano para scripting.

## Capabilities

### Modified Capabilities
- `cli-instalacion` — agrega el comando `tui` como superficie interactiva principal, sin cambiar
  el contrato de autenticación, visibilidad ni el formato de `pull`.

## Impact

- `package.json` — nueva dependencia `ink` (y su tipo, si aplica).
- Nuevo archivo `src/lib/cli/tui.tsx` (componente Ink) + `bin/skills-cli.ts` (nuevo caso `tui` en
  el switch de comandos).
- Reusa `src/lib/cli/client.ts` y `src/lib/cli/commands.ts` tal cual existen — no se duplica lógica
  de fetch/auth/pull.
- Sin impacto en el servidor, en Prisma, ni en MCP — es puramente una superficie nueva del lado del
  CLI.
