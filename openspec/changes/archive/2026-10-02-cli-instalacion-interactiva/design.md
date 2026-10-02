# Design

## Context

Ver `proposal.md` y ADR-0013 (`adrs/0013-cli-instalacion-interactiva.md`) para la decisión completa
ya cerrada. El servidor MCP (ítems #9/#10) y el filtrado por visibilidad/propiedad (ítem #16,
ADR-0011) ya existen y se reutilizan tal cual.

## Goals / Non-Goals

**Goals:**
- Contenido completo de cada skill (`files Json`) guardado en Postgres al momento de la ingesta.
- `get_skill`/`get_version` exponen ese contenido, respetando los filtros de visibilidad ya
  implementados.
- CLI standalone (`bin/skills-cli.ts`) con `login`/`whoami`/`list`/`search`/`pull`, hablando contra
  el mismo endpoint `/api/mcp` que cualquier otro cliente MCP.

**Non-Goals:**
- Empaquetar y publicar el CLI en el registro de npm — queda para cuando se trabaje el ítem #15
  (deploy) o después.
- Resolver el modelo de licencia por skill (sigue abierto, ver PRD.md → Historial de cambios).
- Re-ingerir retroactivamente las 13 skills de ejemplo para poblarles `files` — sus versiones
  actuales quedan con `files` vacío/null hasta que se vuelvan a publicar; no es bloqueante.
- Soportar `publish_skill` con contenido de archivos vía MCP — ese flujo sigue siendo solo
  metadata; el contenido entra al registro únicamente vía la ingesta de GitHub Action.

## Decisions

### 1. `files` como `Json`, no una tabla `SkillFile` separada
- **Decisión:** `SkillVersion.files Json?` — mapa `{ "ruta/relativa": "contenido" }`.
- **Razón:** el volumen por skill es texto markdown pequeño (ya existe el caso real
  `manual-desarrollo` con 2 archivos); una tabla nueva con relación 1:N sería sobre-ingeniería para
  este tamaño de dato. Un campo JSON es la opción más simple que cubre el caso real conocido.

### 2. El CLI es un cliente MCP más, no una API paralela
- **Decisión:** `bin/skills-cli.ts` hace peticiones HTTP directas a `/api/mcp` (el mismo endpoint
  que ya consumen Claude Code/Antigravity), invocando `list_skills`/`search_skills`/`get_skill` de
  la misma forma.
- **Razón:** evita duplicar la lógica de auth/filtros de visibilidad que ya vive ahí. Construir una
  API REST nueva en paralelo solo para el CLI sería redundante.

### 3. Selector interactivo con `readline/promises`, sin dependencia nueva
- **Decisión:** `list`/`search`/`pull` muestran una lista numerada y piden al usuario escribir el
  número elegido, usando el módulo `readline/promises` ya incluido en Node.
- **Razón:** no hay ninguna librería de prompts ya instalada en el proyecto (se revisó
  `package.json`); agregar una (ej. `inquirer`, `prompts`) solo para esto es una dependencia nueva
  evitable para una interacción tan simple.

### 4. Auth del CLI reutiliza Personal Access Tokens existentes
- **Decisión:** `login --token <PAT>` guarda el token crudo en
  `~/.config/cloudcode-skills/config.json` (fuera del repo). Ningún comando nuevo de emisión de
  tokens — se generan desde `/admin/tokens` como ya existe.
- **Razón:** ya existe un sistema completo de tokens con scopes y revocación (ADR-0008/0010); un
  mecanismo de login nuevo (OAuth device flow, etc.) sería trabajo redundante para este alcance.

### 5. Destino de `pull`: `.claude/skills/<slug>/` por defecto
- **Decisión:** convención de Claude Code por defecto, con flag `--dir` para otros agentes con
  convención distinta.
- **Razón:** es la convención más estandarizada hoy; forzar al usuario a especificar siempre el
  destino sería fricción innecesaria para el caso más común.

## Risks / Trade-offs

- [Las 13 skills de ejemplo no tienen `files` poblado hasta que se re-ingieran] → Aceptado, no
  bloqueante; `pull` sobre esas skills específicas simplemente no tendría contenido hasta
  re-publicarlas.
- [`readline/promises` da una UX más simple que una librería de prompts dedicada (sin flechas,
  sin autocompletado)] → Aceptado para este alcance; si la UX se vuelve un problema real, se
  reevalúa agregar una dependencia.
