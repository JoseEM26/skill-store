# Tasks

## 1. Comando `tui`

- [x] 1.1 Agregar `ink` y `ink-text-input` a `package.json` (dependencias, no devDependencies —
      el CLI las necesita en runtime). Confirmar que la versión elegida es compatible con React 19
      (ya instalado en el proyecto).
- [x] 1.2 Crear `src/lib/cli/tui.tsx`: componente `SkillsTui` que al montar llama
      `callMcpTool('list_skills', ...)` (reusando el token guardado via `readStoredToken`, igual
      que `handleListOrSearch`), mantiene estado de filtro de texto y de índice seleccionado,
      renderiza la lista filtrada con bordes/estilo (Ink/`ink-text-input`), navega con flechas o
      `j`/`k`, confirma con Enter llamando `handlePull` ya existente, y sale con Esc/`q` sin hacer
      pull. Mostrar badges `[Privada]`/`[Pausada]` igual que ya hace `handleListOrSearch`.
- [x] 1.3 Agregar el caso `tui` en `bin/skills-cli.ts` que monta `<SkillsTui />` con `render()` de
      Ink.
- [x] 1.4 Verificar con tests (donde sea practicable sin un TTY real — ej. testear la lógica de
      filtrado/selección del componente de forma aislada, o con `ink-testing-library` si hace
      falta) que: el filtro en vivo reduce la lista correctamente, Enter sobre un ítem dispara
      `handlePull` con el owner/slug correcto, y una sesión autenticada incluye skills propias
      privadas/pausadas sin mezclar las ajenas (mismo criterio ya usado en los tests de
      `handleListOrSearch`).

## 2. Verificación integral

- [x] 2.1 Ejecutar `pnpm test && pnpm build && pnpm lint` con todos los cambios integrados y
      verificar que no quede ningún test roto.
