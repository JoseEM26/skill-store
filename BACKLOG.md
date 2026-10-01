# Backlog: CloudCode Skills Registry

| # | Item | Alcance | Depende de | Contexto extra requerido |
|---|---|---|---|---|
| 1 | Esqueleto del proyecto | Next.js + TS + Tailwind inicializado, corriendo localmente ("hola mundo" vía `pnpm dev`) | — | — |
| 2 | Diseño visual (Stitch) | Mockups de catálogo, detalle de skill, login y panel admin | — | — |
| 3 | Modelo de datos + Prisma | Schema User/Skill/SkillVersion/Context/AccessToken (ADR-0003) + migraciones contra Postgres local en Docker — **hecho** ✓ | #1 | — |
| 4 | GitHub Actions: validación + ingesta al backend | Lint, validar frontmatter/YAML de `SKILL.md`, semver, tag/release, escribir Skill+SkillVersion en Postgres | #3 | — |
| 5 | Catálogo público de solo lectura | Listar/buscar/detalle/changelog leyendo desde Postgres (poblado por #4) | #2, #4 | — |
| 6 | Login (GitHub OAuth + JWT) | Entrar con GitHub, sesión JWT con expiración configurable, sin escritura real todavía | #2, #3 | — |
| 7 | Panel admin de escritura | Crear/editar ideas y contextos propios, publicar skills propias, atribución de dueño, ideas privadas por defecto | #3, #6 | — |
| 8 | Tokens de acceso al MCP con scopes | Emitir/revocar tokens (`read`/`write`/`delete`) desde el panel, hash en DB, revocación efectiva desde la siguiente llamada | #3, #7 | — |
| 9 | Servidor MCP de solo lectura | `list_skills`, `search_skills`, `get_skill`, `get_version`, `check_updates`, `list_contexts`/`get_context`, "traer todo mi setup" | #4, #8 | — |
| 10 | Servidor MCP de escritura | `create_context`, `update_context`, `delete_context`, `publish_skill`, `delete_skill`, protegidos por scope + dueño | #8, #9 | — |
| 11 | Contadores de popularidad | Incrementar `downloadsCount`/`installsCount` desde la web y el MCP/CLI | #5, #9, #10 | — |
| 12 | Namespacing de slugs duplicados entre dueños | Publicar/rutear skills por `owner/slug`, rechazar o namespacear colisiones | #4, #7 | — |
| 13 | Archivado de recursos al borrar/revocar cuenta | Skills/contextos públicos se archivan (no se borran); ideas privadas sí se eliminan | #6, #7 | — |
| 14 | Rate limiting básico por IP | Contador de ventana deslizante en Postgres (ADR-0007) + purga periódica de la tabla | #4 | — |
| 15 | Conectar Vercel + Neon (deploy real) | Migrar de Postgres local en Docker a Neon, desplegar el monolito en Vercel, verificar el flujo completo contra infra real | #1-#14 | — |

**Contexto de dominio:** ninguno de estos ítems necesita reglas de negocio especializadas — es un registro de skills genérico, no un dominio regulado; todo lo necesario ya está en el PRD/TDD.

**Desarrollo 100% local hasta el ítem #15:** todo el desarrollo (#1 a #14) corre contra el Postgres
local en Docker que ya levantamos (`docker-compose.yml`, puerto 5433) — nunca contra Neon. Ningún
`proposal.md`/`design.md`/`tasks.md` de los ítems #1-#14 debe incluir pasos de deploy, conexión a
Vercel, ni conexión a Neon: eso es exclusivamente el alcance del ítem #15, el último del backlog, y
no se toca hasta que el usuario lo pida explícitamente. `openspec/config.yaml` (campo `context`)
ya trae esta regla para que cualquier `propose` futuro la respete sin que haya que repetirla.

## Cómo usar este backlog

Cada ítem es una spec independiente. Al implementarlo, arrancá un ciclo de Spec-Driven
Development (`/opsx:propose` o el flujo equivalente de tu harness) usando este ítem como el
"change" — no el proyecto completo. Si la columna "Contexto extra requerido" tiene algo,
compartilo como contexto al generar la spec de ese ítem.
