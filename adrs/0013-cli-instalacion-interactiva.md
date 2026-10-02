# ADR 0013: CLI interactivo multi-agente para listar/traer skills

## Estado

Aceptado (implementado como ítem #17 del backlog)

## Contexto

El servidor MCP (ítems #9/#10) ya es agnóstico del cliente: cualquier IA o editor que hable MCP
(Claude Code, Antigravity, OpenCode, etc.) puede conectarse y llamar `list_skills`, `search_skills`,
`get_skill`, `publish_skill`, etc. Lo que falta es que el propio usuario, desde una terminal, sin
pasar por una IA, pueda listar sus skills/agentes, elegir cuáles quiere, y traerlos a un proyecto
— hoy esa interacción solo existe si una IA decide llamar las tools por vos.

Además, hoy el registro solo guarda metadata de cada `SkillVersion` (`version`, `changelog`,
`gitTag`) — el contenido real de los archivos de la skill vive en el repo de GitHub del dueño, leído
una sola vez al momento de la ingesta (GitHub Action). Para que un comando "traer esta skill" pueda
funcionar de forma confiable (sin depender de que ese repo siga público/disponible después), el
contenido necesita vivir en el propio registro.

## Decisión

1. **Guardar el contenido completo de cada skill en Postgres.** Nuevo campo
   `files Json` en `SkillVersion` (mapa `ruta relativa → contenido`, ej. `{"SKILL.md": "...",
   "plantilla-visual.html": "..."}` — ya existe al menos un caso real de skill con más de un
   archivo, `manual-desarrollo`). Se llena en la ingesta desde GitHub Action
   (`src/lib/skills/ingest.ts` + `scripts/ingest-skills.ts`), leyendo todo el directorio de la
   skill, no solo el frontmatter.
2. **Extender `get_skill`/`get_version` (MCP, `src/lib/mcp/tools.ts`) para devolver `files`**,
   respetando exactamente los mismos filtros de propiedad/visibilidad ya implementados en el ítem
   #16 (ADR-0011) — una skill privada/pausada ajena no expone su contenido igual que no expone su
   metadata.
3. **Nuevo CLI standalone, sin empaquetar a npm todavía** (seguimos en fase 100% local hasta el
   ítem #15): `bin/skills-cli.ts`, ejecutado como `tsx bin/skills-cli.ts <comando>` (mismo patrón ya
   usado por `scripts/ingest-skills.ts`). El CLI es simplemente **otro cliente MCP** — habla HTTP
   contra el mismo endpoint `/api/mcp` que ya usan Claude Code/Antigravity, no una API paralela.
   Comandos:
   - `login --token <PAT>` — guarda el token en `~/.config/cloudcode-skills/config.json`.
   - `whoami` — confirma la sesión activa.
   - `list` / `search <query>` — lista con selector interactivo (`readline/promises` de Node, sin
     dependencias nuevas).
   - `tui` — **[revisado el 2026-10-02, ver nota al final]** dashboard interactivo de pantalla
     completa (navegación por flechas, filtro en vivo, Enter para traer la skill seleccionada).
   - `pull <owner>/<slug> [--dir <ruta>]` — escribe los `files` de la skill elegida en el proyecto
     actual. Default `--dir`: `.claude/skills/<slug>/` (convención estándar de Claude Code);
     configurable para otros agentes con otra convención de carpetas.
4. **Autenticación: reusar el sistema de Personal Access Tokens ya existente** (ADR-0008/0010,
   panel `/admin/tokens`). No se construye un mecanismo de login nuevo.

## Alternativas consideradas

- **"Prompts" de MCP como slash-commands en vez de un CLI aparte** — se descarta: el soporte de
  "prompts" como comandos invocables varía mucho entre clientes MCP (Claude Code, Antigravity,
  OpenCode no los exponen todos igual), mientras que cualquier agente puede ejecutar un comando de
  shell.
- **API REST nueva en paralelo al endpoint MCP para que hable el CLI** — se descarta: duplicaría la
  lógica de auth/filtros de visibilidad que ya vive en `/api/mcp`; el CLI puede ser un cliente MCP
  más.
- **Seguir leyendo el contenido desde el repo de GitHub del dueño en el momento del `pull`** — se
  descarta: depende de que ese repo siga público y disponible indefinidamente, y la skill podría
  pertenecer a un repo que luego se vuelve privado o se borra. Guardar el contenido en el propio
  registro lo hace autocontenido.

## Consecuencias

- Requiere una migración de Prisma (`files Json` en `SkillVersion`, sin romper filas existentes —
  las 13 skills ya ingeridas no tienen este campo poblado retroactivamente salvo que se re-ingieran;
  queda como limitación conocida, no bloqueante).
- Extiende la ingesta de GitHub Action para leer el directorio completo de cada skill, no solo
  `SKILL.md` vía frontmatter.
- No resuelve el modelo de licencia por skill (sigue abierto, ver PRD.md → Historial de cambios).
- El empaquetado real del CLI para distribución (`npm publish`, nombre de paquete público) queda
  fuera de este ADR — es trabajo del ítem #15 (deploy) o posterior.

## Revisión 2026-10-02: comando `tui` con Ink

El selector `readline/promises` (lista numerada, escribir un número) se sintió pobre comparado con
una TUI real (referencia pedida explícitamente: `engram tui`, construida con el stack de Charm en
Go — `bubbletea`/`bubbles`/`lipgloss`: navegación por flechas, panel con bordes, filtro en vivo).
Reproducir eso a mano con solo `readline` no es viable en pocas líneas, así que se revierte
puntualmente la regla de "sin dependencias nuevas" para este caso:

- **Decisión:** agregar `ink` (React para terminales) como dependencia. El proyecto ya depende de
  `react` (Next.js), así que el salto conceptual es mínimo — mismo modelo de componentes que el
  resto del código. Nuevo comando `tui` (`pnpm cli tui`): lista navegable con flechas, filtro en
  vivo por texto, Enter trae (`pull`) la skill seleccionada con el mismo código ya existente en
  `src/lib/cli/commands.ts` (sin duplicar lógica), Esc/`q` para salir.
- **Alternativa descartada:** `@clack/prompts` (prompts interactivos livianos, sin dependencia de
  React) — da una UX más linda que el `readline` actual pero no un dashboard de pantalla completa
  persistente; no llega al nivel pedido ("algo así como `engram tui`").
- **`list`/`search` sin TTY o en modo `--non-interactive` siguen igual** (salida de texto plano,
  pensada para scripting) — el comando `tui` es la superficie nueva para uso interactivo real.
