# Proposal

## Why

El servidor MCP ya permite que cualquier IA que hable MCP (Claude Code, Antigravity, OpenCode,
etc.) liste y traiga skills por vos, pero no hay forma de que el usuario mismo, desde una
terminal y sin pasar por una IA, liste sus skills/agentes y elija cuáles traer a un proyecto. Hoy
además el contenido real de cada skill no vive en el registro — solo metadata (`version`,
`changelog`, `gitTag`) — así que ni siquiera una IA puede "traer" el contenido completo de una
skill sin ir al repo de GitHub original.

## What Changes

- Nuevo campo `files Json` en `SkillVersion` (mapa ruta relativa → contenido completo del
  archivo), poblado en la ingesta desde GitHub Action.
- `get_skill`/`get_version` (MCP) devuelven `files`, respetando los mismos filtros de
  propiedad/visibilidad del ítem #16 (ADR-0011): una skill privada/pausada ajena no expone su
  contenido, igual que no expone su metadata.
- Nuevo CLI standalone (`bin/skills-cli.ts`, `tsx bin/skills-cli.ts <comando>`) como cliente MCP
  más — habla contra el mismo endpoint `/api/mcp`, no una API paralela. Comandos: `login --token`,
  `whoami`, `list`, `search <query>`, `pull <owner>/<slug> [--dir <ruta>]` con selector interactivo
  (`readline/promises` de Node, sin dependencias nuevas). Auth reusa el sistema de Personal Access
  Tokens ya existente (ADR-0008/0010).
- Destino por defecto de `pull`: `.claude/skills/<slug>/` (convención de Claude Code), con `--dir`
  para otros agentes.

## Capabilities

### New Capabilities
- `cli-instalacion` — comandos del CLI standalone (`login`, `whoami`, `list`, `search`, `pull`) y
  su contrato de autenticación/escritura en disco.

### Modified Capabilities
- `data-model` — nuevo campo `files Json` en `SkillVersion`.
- `skill-ingestion` — la ingesta desde GitHub Action ahora lee y guarda el contenido completo de
  cada archivo de la skill, no solo el frontmatter.
- `servidor-mcp-lectura` — `get_skill`/`get_version` exponen `files`, con los mismos filtros de
  visibilidad/propiedad ya existentes.

## Impact

- `prisma/schema.prisma` — migración nueva (`SkillVersion.files`).
- `src/lib/skills/ingest.ts`, `scripts/ingest-skills.ts`, `src/lib/skills/validation.ts` — leer
  directorio completo de la skill, no solo `SKILL.md` parseado.
- `src/lib/mcp/tools.ts` (`handleGetSkill`, `handleGetVersion`) — exponer `files`.
- Nuevo archivo `bin/skills-cli.ts` + script `"cli"` en `package.json`.
- Nuevo archivo de config local del CLI (`~/.config/cloudcode-skills/config.json`), fuera del
  repo.
- Sin impacto en Vercel/Neon — sigue siendo desarrollo 100% local (regla activa hasta el ítem #15).
