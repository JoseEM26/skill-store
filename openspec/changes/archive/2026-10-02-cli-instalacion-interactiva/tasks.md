# Tasks

## 1. Contenido de skills en Postgres (hacer primero, en solitario — el CLI depende de esto)

- [x] 1.1 Agregar `files Json?` a `SkillVersion` en `prisma/schema.prisma`, migrar contra el
      Postgres local (`npx prisma migrate dev`), verificando que las `SkillVersion` existentes
      quedan con `files: null` sin perder datos.
- [x] 1.2 Extender `src/lib/skills/ingest.ts` (y lo que use `scripts/ingest-skills.ts`) para leer
      el contenido completo de cada archivo del directorio de la skill (no solo `SKILL.md`
      parseado) y guardarlo como `files` en la `SkillVersion` creada, verificando con un test que
      una skill con archivos adicionales a `SKILL.md` (ej. el caso real `manual-desarrollo`) guarda
      el contenido de todos ellos.
- [x] 1.3 Actualizar `handleGetSkill`/`handleGetVersion` en `src/lib/mcp/tools.ts` para incluir
      `files` en la respuesta, reusando exactamente los filtros de visibilidad/propiedad ya
      implementados en el ítem #16, y verificar con un test que una skill privada/pausada ajena
      no expone `files` (mismo comportamiento que ya tiene para su metadata).

## 2. CLI standalone (después del grupo 1 — depende de que get_skill/get_version devuelvan files)

- [x] 2.1 Crear `bin/skills-cli.ts` con los comandos `login --token <PAT>` (guarda el token en
      `~/.config/cloudcode-skills/config.json`) y `whoami` (confirma la sesión activa contra el
      servidor, informa claramente si no hay sesión o el token fue revocado). Agregar script
      `"cli": "tsx bin/skills-cli.ts"` a `package.json`.
- [x] 2.2 Agregar los comandos `list` y `search <query>` al CLI: peticiones HTTP directas a
      `/api/mcp` (`list_skills`/`search_skills`), incluyendo el token guardado si existe, con un
      selector numerado interactivo vía `readline/promises` (sin dependencias nuevas). Verificar
      que sin sesión solo se listan skills públicas/no pausadas, y que con sesión se incluyen
      además las privadas/pausadas propias sin mezclar las ajenas.
- [x] 2.3 Agregar el comando `pull <owner>/<slug> [--dir <ruta>]`: llama `get_skill` vía
      `/api/mcp`, escribe cada archivo de `files` en el directorio destino (default
      `.claude/skills/<slug>/`), y verificar con un test que el pull de una skill privada/pausada
      ajena se rechaza igual que lo rechaza el servidor MCP subyacente, mientras que una skill
      propia privada/pausada sí se trae correctamente.

## 3. Verificación integral

- [x] 3.1 Ejecutar `pnpm test && pnpm build && pnpm lint` con todos los cambios integrados y
      verificar que no quede ningún test roto.
