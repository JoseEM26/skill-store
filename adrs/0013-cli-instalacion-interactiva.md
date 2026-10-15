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

## Revisión 2026-10-04: paginación y selección múltiple en `tui`

Con catálogos reales el `tui` listaba todas las skills de una (sin límite), lo que desborda el
panel de la terminal y hace incómodo navegar. Además solo permitía traer una skill a la vez.

- **Decisión:** la lista del `tui` pasa a ser una ventana deslizante (scrolling viewport) de 5
  ítems visibles a la vez — no "páginas" con click, sino que navegar con flecha abajo más allá del
  último ítem visible desplaza la ventana, mostrando un indicador tipo "3-7 de 23". Se agrega
  selección múltiple con la tecla Tab (toggle sobre el ítem resaltado, marcado visualmente,
  ej. `[x]`); Enter trae (`pull`) todos los ítems marcados — si ninguno fue marcado con Tab,
  Enter sigue trayendo solo el ítem resaltado (compatibilidad con el comportamiento actual).
- **Razón:** una ventana deslizante de tamaño fijo es más simple de implementar y más predecible
  para el usuario que paginación con números de página, y resuelve exactamente el problema
  reportado ("no quiero que se salga del panel terminal").
- **Alcance explícitamente fuera de esta revisión:** filtros estructurados adicionales (por
  visibilidad, por dueño, etc.) más allá del filtro de texto en vivo ya existente — el pedido fue
  ambiguo y se prioriza lo concreto (paginación + selección múltiple). Puede revisarse después con
  un pedido más específico.

## Revisión 2026-10-05: comando `logout` y alias de comando con nombre de marca

No había forma de cerrar sesión (ni, por lo tanto, cambiar de cuenta de forma limpia) desde el
CLI — `login --token <X>` sobrescribe el token guardado, pero no existía ningún comando para
borrarlo. Además, el alias `pnpm cli <comando>` no refleja el nombre de la plataforma
("CloudCode Skills Registry"), sintiéndose genérico.

- **Decisión:** agregar el comando `logout` (borra el token guardado en
  `~/.config/cloudcode-skills/config.json`, confirma con un mensaje claro si no había sesión
  activa). Renombrar el alias del script en `package.json` de `"cli"` a `"cloudcode"` — el comando
  pasa a invocarse `pnpm cloudcode <comando>` (ej. `pnpm cloudcode logout`, `pnpm cloudcode tui`),
  reflejando el nombre real del producto. El archivo `bin/skills-cli.ts` y su texto de ayuda
  interno (`Uso: skills <comando>...`) se actualizan para decir `cloudcode` en vez de `skills`.
- **Razón:** cerrar sesión es una operación básica de cualquier CLI con autenticación; no tenerla
  obligaba a buscar y borrar el archivo de config a mano para cambiar de cuenta. El alias
  "cli" genérico no comunica qué producto es — renombrarlo a `cloudcode` es consistente con el
  nombre ya usado en el header del `tui` ("☁️ CloudCode Skills Registry").
- **Alcance fuera de esta revisión:** no se agrega un keybinding de logout dentro del propio
  `tui` (que es específicamente para navegar/traer skills) — cerrar sesión sigue siendo un
  comando aparte, corrido antes o después de usar `tui`. El renombrado de `bin/skills-cli.ts` como
  archivo (vs. solo el alias del script) queda a criterio de quien implemente, sin ser
  obligatorio.

## Revisión 2026-10-05: menú principal con categorías al entrar a `tui`

Hoy `tui` entra directo a una lista plana mezclando skills propias y públicas de otros (con
badges `[Privada]`/`[Pausada]` inline), y el modo Grupos solo es alcanzable con el atajo oculto
Ctrl+G. El usuario pidió explícitamente un menú de opciones visible al entrar, para elegir entre
grupos, skills públicas de la comunidad, y las propias (separadas por públicas/privadas).

- **Decisión:** `tui` pasa a abrir en una pantalla de **menú principal** (nuevo modo `'menu'`),
  con las opciones:
  1. 🔍 Explorar todas (comportamiento actual: combinado, propias + públicas de otros)
  2. 👤 Mis skills públicas
  3. 🔒 Mis skills privadas
  4. 🌐 Skills públicas de la comunidad (excluye las propias)
  5. 📦 Grupos
  6. Salir
  Navegación con flechas + Enter para entrar a la categoría elegida. Dentro de cualquier lista,
  **Esc vuelve al menú principal** (no cierra la app); solo Esc/`q` desde el menú principal cierra
  `tui`. El atajo Ctrl+G se elimina (reemplazado por la opción de menú "Grupos").
- **Fuente de datos (sin cambios de backend/MCP):** se reutilizan las tools MCP ya existentes.
  `get_my_setup` ya devuelve `skills` = todas las propias (cualquier visibilidad) vía
  `ownerId: userId` — de ahí se derivan "Mis skills públicas"/"Mis skills privadas" filtrando
  client-side por `isPublic`. `list_skills` ya devuelve el combinado (propias + públicas de
  terceros) — de ahí se derivan "Explorar todas" (sin cambios) y "Skills públicas de la
  comunidad" filtrando client-side por `owner !== username propio` (obtenido de
  `get_my_setup().user.username`, una sola llamada cacheada al entrar al menú).
- **Razón:** no se necesita ningún parámetro nuevo en el servidor MCP — los tres conjuntos de
  datos (propias, combinado, público-de-terceros) ya son derivables en el cliente a partir de dos
  tools de lectura existentes, evitando tocar `src/lib/mcp/tools.ts`.
- **Riesgo conocido a vigilar en la implementación:** la misma clase de bug ya encontrada dos
  veces en este componente (tecla imprimible de atajo colisionando con el foco permanente de
  `ink-text-input`, corrompiendo el filtro en vivo) — cualquier atajo nuevo de navegación del menú
  debe evitar teclas imprimibles sueltas mientras el filtro esté activo, siguiendo el mismo
  criterio ya aplicado a Tab (marcar) y Ctrl+G (antes de removerse en esta revisión).
- **Alcance fuera de esta revisión:** no se agrega un filtro de categoría dentro de "Explorar
  todas" (sigue siendo la vista combinada tal cual existe hoy) — las categorías nuevas son rutas
  de menú alternativas, no un filtro adicional sobre la vista combinada.

## Revisión 2026-10-05: apartado de login/logout dentro del menú principal de `tui`

Con el menú principal ya implementado (revisión anterior), el usuario reportó que no ve ninguna
opción de iniciar/cerrar sesión al entrar a `tui` — hay que salir y correr `cloudcode
login`/`cloudcode logout` aparte. Esto **revierte puntualmente** la nota de alcance de la revisión
"comando `logout`..." (2026-10-05, más arriba) que decía explícitamente que no se agregaría un
keybinding de logout dentro del `tui`: en uso real, mezclar el menú de navegación con un apartado
visible de sesión resultó más natural que mantenerlos separados.

- **Decisión:** el menú principal gana un ítem adicional, dinámico según el estado de sesión
  (determinado localmente vía `readStoredToken`, sin llamada de red):
  - Sin sesión activa: `🔑 Iniciar sesión` — al seleccionarlo, `tui` sale mostrando un mensaje
    instructivo con el comando exacto a correr (`cloudcode login --token <tu_token>`) y dónde
    generar un token (`<baseUrl>/admin/tokens`). No se construye un flujo de entrada de token
    dentro de Ink (ver Alternativas).
  - Con sesión activa: `🚪 Cerrar sesión` — al seleccionarlo, ejecuta `clearStoredToken` (mismo
    código ya usado por `cloudcode logout`) y sale mostrando el mismo mensaje de confirmación
    ("Sesión cerrada correctamente.").
- **Razón:** reutiliza exactamente la lógica ya implementada y verificada (`clearStoredToken`) en
  vez de duplicarla; evita construir un campo de entrada de texto enmascarado para pegar un token
  secreto dentro de Ink, que es trabajo bastante mayor para un beneficio marginal frente al comando
  `login` ya existente y ya probado end-to-end.
- **Alternativas consideradas:** aceptar el token pegado directamente dentro de `tui` (vía un
  `<TextInput>` adicional) — se descarta por ahora: requiere enmascarar el valor, validar formato,
  y manejar el mismo riesgo de conflicto de foco con atajos ya documentado en este archivo: no
  vale la pena duplicar lo que `cloudcode login --token <PAT>` ya resuelve bien.
- **Riesgo conocido a vigilar en la implementación:** mismo que la revisión anterior — no usar
  teclas imprimibles sueltas como atajo mientras el filtro esté activo.

## Revisión 2026-10-07: login automático vía navegador (sin copiar/pegar un token)

El flujo actual de "🔑 Iniciar sesión" (revisión anterior) solo imprime instrucciones: el usuario
tiene que abrir `/admin/tokens` a mano, crear un token, copiarlo, y pegarlo en
`cloudcode login --token <PAT>`. El usuario pidió que, al elegir esa opción, el navegador se abra
solo, inicie sesión ahí (GitHub OAuth, que ya existe), y el CLI reciba el token automáticamente —
sin copiar/pegar nada. Mismo patrón que `gh auth login`, `vercel login`, `wrangler login`, etc.

- **Decisión — "device flow" simplificado vía callback local:**
  1. El CLI (tanto `cloudcode login` sin `--token` como la opción "Iniciar sesión" del `tui`)
     levanta un servidor HTTP local efímero en un puerto libre (`localhost:<puerto>`), genera un
     `state` aleatorio de un solo uso, y abre el navegador por defecto del sistema en
     `<baseUrl>/admin/cli-auth?port=<puerto>&state=<state>` (usando el mismo mecanismo ya usado en
     otros proyectos: `open`/`xdg-open`/`start` según el SO — sin agregar una librería nueva si el
     comando nativo del SO alcanza).
  2. **Nueva página `/admin/cli-auth`** (bajo `/admin/*`, así reutiliza gratis la protección ya
     existente del middleware: si no hay sesión, redirige a GitHub OAuth y vuelve acá después del
     login).
  3. Una vez autenticado, `/admin/cli-auth` genera un Personal Access Token nuevo (reusando
     `createAccessToken`, scopes `['read','write']`, label `"CLI login <fecha>"`) y lo manda al
     callback local del CLI con un **POST desde JS en el cliente** (`fetch('http://localhost:<puerto>/callback', { method: 'POST', body: JSON.stringify({ token, state }) })`)
     — nunca como parámetro de URL/redirect, para que el token no quede en el historial del
     navegador ni en logs de acceso. La página muestra luego "✅ Listo, podés cerrar esta pestaña."
  4. El servidor local del CLI recibe el POST en `/callback`, valida que el `state` coincida con
     el que generó (si no, lo ignora), guarda el token con `saveStoredToken` (mismo código que
     `cloudcode login --token`), cierra el servidor local, y confirma en la terminal/tui.
  5. **Timeout de 3 minutos**: si no llega el callback, el CLI corta el servidor local y muestra un
     mensaje claro con la alternativa manual (`cloudcode login --token <PAT>`, que sigue existiendo
     sin cambios).
  6. **Si no se puede abrir un navegador** (entorno headless/SSH sin `DISPLAY`): el CLI detecta el
     fallo al invocar el comando de apertura del SO y cae de inmediato al mensaje manual actual
     (imprime la URL completa para abrir a mano, igual que hoy).
- **Razón:** el usuario ya tiene sesión de GitHub en el navegador en la mayoría de los casos —
  automatizar la creación y entrega del token elimina por completo el paso manual de
  copiar/pegar, que es justamente la fricción reportada. El state de un solo uso + POST (no GET)
  evita que el token quede expuesto en el historial del navegador o en una URL compartida por
  accidente.
- **Alcance sin cambios respecto a la revisión anterior:** `cloudcode login --token <PAT>` sigue
  funcionando exactamente igual (camino manual, para CI/scripts/entornos sin navegador). No se
  agrega ningún campo de texto dentro de Ink — sigue siendo válido lo ya decidido arriba.
- **Alternativas consideradas:** un flujo de "device code" completo tipo OAuth Device Authorization
  Grant (RFC 8628), con un código corto que el usuario escribe a mano en el navegador — se
  descarta por ahora: más robusto para el caso de que el CLI corra en una máquina distinta a la del
  navegador (ej. un servidor remoto por SSH), pero bastante más trabajo de implementar; el callback
  local alcanza para el caso de uso real (todo corre en la misma laptop). Puede revisarse si en el
  futuro se usa el CLI desde un entorno remoto real.

## Revisión 2026-10-05: banner grande de marca en la pantalla de menú de `tui`

El usuario pidió explícitamente un diseño más grande y vistoso para el nombre de la marca al
entrar a `tui` ("el nombre del logo de la empresa grande, mejor el diseño... un banner grande"),
en vez del título de una sola línea que hoy encabeza cada pantalla (`☁️ CloudCode Skills Registry
- Menú Principal`).

- **Decisión:** la pantalla de **menú principal** (el "índice" de `tui`, primera pantalla al
  entrar) gana un banner ASCII grande con el nombre "CLOUDCODE" como arte de texto multi-línea
  (estilo bloque, similar a `figlet`), renderizado con `<Text bold color="cyan">` de Ink línea por
  línea dentro del `Box` del encabezado — **sin agregar ninguna dependencia nueva** (nada de
  `figlet`/`chalk-animation`/etc., el arte ASCII se escribe como constante estática de strings,
  siguiendo la regla ya establecida en este proyecto de no sumar dependencias para esto). Debajo
  del banner grande, se mantiene el subtítulo "Skills Registry" y la línea de versión/ayuda ya
  existente. **Las pantallas de lista** (Explorar todas, Mis skills, Grupos, etc.) **mantienen el
  encabezado compacto de una línea actual** — el banner grande es solo para la pantalla de menú,
  para no robar espacio vertical de la ventana deslizante de 5 ítems al navegar.
- **Razón:** una sola pantalla (el menú/índice, que es la portada de la herramienta) se beneficia
  de una presencia de marca grande; las pantallas de navegación activa priorizan densidad de
  información (más ítems visibles) sobre decoración.
- **Alcance fuera de esta revisión:** no se agrega color configurable/temas, ni animación — texto
  estático en negrita, un solo color fijo (cian, consistente con el color ya usado en el modo
  "Explorar todas"/"skills" de este componente).
