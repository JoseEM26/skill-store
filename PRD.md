---
title: "CloudCode Skills Registry"
---

# PRD: CloudCode Skills Registry

## Problema

Hoy el conocimiento y las herramientas que el usuario reutiliza entre proyectos — skills propias,
ideas/notas de producto, y referencias a repos y herramientas del ecosistema de IA que sigue
(ej. superpowers, context7, herdr) — están dispersos y no versionados en ningún lugar central.
Cada vez que abre una sesión nueva de Claude Code sin contexto previo, tiene que reconstruir ese
contexto a mano: correr `npx skills add` uno por uno, copiar archivos, o volver a explicar ideas ya
pensadas. No existe un registro único, consultable por Claude Code de forma programática (MCP),
que traiga todo eso de una sola vez.

## Usuario objetivo

- El propio usuario (dueño del registro), en cualquier sesión nueva de Claude Code, sin contexto
  previo, que quiere traer sus skills, ideas y referencias de contexto en un solo paso.
- Otros desarrolladores que usan Claude Code y quieren descubrir, instalar y mantener actualizadas
  skills públicas del catálogo.
- Mantenedores de skills que quieren publicarlas con versionado semántico.

## Objetivo / resultado esperado

Desde cualquier sesión nueva de Claude Code, el usuario conecta el MCP y trae en un solo paso todo
lo que necesita — skills, ideas propias, y referencias a contextos/repos externos que quiera tener
a mano (ej. superpowers, context7, herdr) — sin instalar una por una ni copiar archivos a mano.
Todo vive centralizado y versionado en un único registro. Además, cualquier desarrollador puede
entrar a la web, buscar una skill, ver su versión/changelog, copiar el comando de instalación o
descargarla. El usuario dueño del registro administra su contenido (crear/editar ideas, agregar
referencias de contexto, gestionar skills) desde un panel administrativo protegido por login, de
forma que solo él (o a quien autorice explícitamente) pueda escribir o configurar algo a través del
MCP o del panel — cualquier otro solo puede leer el catálogo público.

## Alcance (qué sí incluye esta versión)

- Repositorio GitHub como source of truth de las **skills**: carpeta `skills/`, un `SKILL.md` por
  skill con frontmatter validado (`name`, `version`, `description`, `author`, `license`,
  `repository`).
- Catálogo de **"contextos"**, más allá de skills instalables: entradas para ideas propias
  (texto/notas) y referencias a repos/herramientas externas del ecosistema (nombre, descripción,
  link, tags), gestionadas desde el mismo backend y expuestas por el mismo MCP.
- Monolito Next.js (frontend + API en un solo proyecto/deploy) con API REST para skills y
  contextos: listar, obtener por slug, versiones, última versión, búsqueda.
- Catálogo público (mismo proyecto Next.js): listar, buscar, filtrar, ver detalle, versión,
  changelog, copiar instalación, descargar, enlace a GitHub — para skills y contextos.
- CI/CD con GitHub Actions para skills: lint, validar `SKILL.md`/YAML, semantic versioning, tests,
  tag/release, notificar al backend.
- Servidor MCP (Node.js + TypeScript) con:
  - Herramientas de lectura pública: `list_skills`, `search_skills`, `get_skill`, `get_version`,
    `check_updates`, y sus equivalentes para contextos (`list_contexts`, `get_context`).
  - Una herramienta de "traer todo mi setup" que en una sola llamada devuelve las skills e ideas
    de contexto marcadas como relevantes para el usuario, pensada para arrancar una sesión nueva
    sin instalar nada manualmente.
  - Herramientas de escritura (`create_context`, `update_context`, `delete_context`,
    `publish_skill`, `delete_skill`, etc.) protegidas por **permisos granulares por token**: cada
    token/API Key tiene asignado uno o más scopes (`read`, `write`/`edit`, `delete`), y el MCP
    valida el scope antes de ejecutar la herramienta correspondiente — no es una sola bandera de
    "puede escribir sí/no", sino permisos independientes que el dueño decide por token (ej. un
    token de solo lectura para compartir con otros, uno de lectura+edición para un colaborador de
    confianza, y el token completo con `delete` reservado para el dueño).
- Panel administrativo (rutas protegidas dentro del mismo Next.js) con **login vía GitHub OAuth** para cualquier
  usuario con cuenta de GitHub (no solo el dueño original): crear/editar sus propias ideas y
  referencias de contexto, publicar sus propias skills, y emitir/revocar tokens de acceso para su
  propio MCP **eligiendo qué scopes tiene cada token** (`read`, `write`, `delete`). No hay
  registro con email/contraseña propio — la identidad del usuario en la plataforma es su cuenta
  de GitHub, y el backend emite un JWT de sesión después del OAuth para el panel y la API.
- Cada skill y cada contexto tiene un **dueño/creador** (`owner`, la cuenta de GitHub que lo
  publicó) mostrado en la web como atribución. El dueño de un recurso puede editarlo o borrarlo;
  cualquier otro usuario autenticado solo puede leerlo, salvo que el dueño le comparta
  explícitamente un token con scope de escritura sobre ese recurso — un token nunca da permisos
  de escritura sobre recursos que no son de su dueño, aunque tenga el scope `write`.
- **Ideas privadas por defecto**: una idea/nota solo es visible para su dueño (en el panel y en su
  propio MCP) salvo que el dueño la marque explícitamente como pública. Las referencias de
  contexto (repos/herramientas externas) siguen siendo siempre públicas en el catálogo.
- **Visibilidad de skills (agregado post-MVP, ver Historial de cambios)**: por defecto una skill es
  pública (comportamiento actual, no cambia para las ya publicadas), pero el dueño puede marcarla
  como privada — visible y gestionable solo por él (panel y su propio MCP), oculta del catálogo
  público y de `list_skills`/`search_skills` sin token. El control de visibilidad es el mismo sin
  importar si la skill se publica/edita desde el panel web o desde la tool MCP `publish_skill` /
  `update_skill` — ambos caminos respetan la misma regla, no hay uno más permisivo que el otro.
- **Desactivar/pausar una skill sin borrarla (agregado post-MVP)**: el dueño puede pausar su propia
  skill (oculta del catálogo activo y no instalable desde ahí mientras está pausada) y reactivarla
  cuando quiera, sin perder versiones ni contadores — distinto del archivado automático por borrado
  de cuenta (ver Casos borde), que no es reversible por el usuario.
- **Advertencia al eliminar una skill (agregado post-MVP)**: antes de confirmar el borrado
  definitivo (panel o MCP), mostrar un mensaje de advertencia cuyo texto depende de la visibilidad
  de la skill:
  - Si es/era **pública**: aclarar que se elimina del registro, pero quienes ya la descargaron o
    instalaron conservan su copia local — el registro no puede revocar copias ya distribuidas.
  - Si es/era **privada**: aclarar que se elimina del registro y, al no haber estado nunca en el
    catálogo público, no hay copias de terceros que considerar.
- Autenticación y autorización básicas desde el MVP (no pospuestas): GitHub OAuth + JWT de sesión
  para el panel admin, y tokens de MCP con permisos por scope (lectura / edición / eliminación) en
  vez de un único nivel de acceso. Sin token válido, el MCP solo permite lectura del catálogo
  público (nunca de ideas privadas); con token, cada operación se valida contra los scopes de ese
  token y contra la propiedad del recurso.
- **Popularidad/uso**, mostrado en la card y el detalle de cada skill: contador de descargas
  (botón "Descargar" en la web) y contador de instalaciones (cada vez que el comando de
  instalación se ejecuta a través del MCP o de la CLI propia del registro). Son contadores
  automáticos, no reseñas ni calificación por estrellas.

## No alcance (qué explícitamente no incluye esta versión)

- Roles de plataforma configurables (tipo admin/editor/viewer a nivel de toda la organización) o
  invitaciones/equipos compartiendo un mismo recurso — el modelo de acceso del MVP es
  "dueño del recurso + scopes por token", no un sistema de roles jerárquico.
- Reviews o calificación por estrellas de skills (sí se incluyen contadores automáticos de
  descargas/instalaciones, ver Alcance — eso no es lo mismo que un sistema de reseñas).
- Transferencia de propiedad de una skill/contexto a otro usuario — se resuelve más adelante si
  hace falta; el MVP asume que el dueño de un recurso no cambia salvo el archivado por borrado de
  cuenta descrito en Casos borde.
- Registro con email/contraseña propio — la única vía de login es GitHub OAuth.
- Canales de distribución del catálogo de contextos más allá de web y MCP (el usuario mencionó
  "aparte de MCP podría ser otras cosas" sin definir cuáles — no se construye nada de esto todavía,
  ver riesgos abiertos).
- Marketplace con pagos.
- Analytics complejo, sistema de notificaciones, rate limiting avanzado.
- WebSockets u otro canal en tiempo real — el panel admin y el MCP funcionan con request/response
  normal (REST/HTTP) en esta versión; nada del MVP necesita push instantáneo.
- Kubernetes, arquitectura de microservicios, y colas/búsqueda externas (Kafka, Redis, RabbitMQ,
  Elasticsearch) — no se agregan hasta que exista necesidad real medida.

## Stack técnico

Monolito full-TypeScript (mismo lenguaje que el MCP), elegido por costo cero en tiers gratuitos y
menos runtimes que operar frente a la alternativa Angular + Spring Boot.

- **Framework**: Next.js (App Router) — sirve el frontend (React) y la API (route handlers) desde
  un solo proyecto y un solo deploy.
- **Lenguaje**: TypeScript en todo — web, API y servidor MCP comparten tipos y validaciones.
- **Estilos**: Tailwind CSS.
- **Base de datos**: PostgreSQL gestionado en un free tier serverless (Neon o Supabase).
- **ORM**: Prisma — migraciones versionadas en el repo, cliente tipado a partir del schema.
- **Validación**: Zod en cada endpoint y en cada tool del MCP (nunca confiar en el input tal cual
  llega).
- **Auth del panel**: Auth.js (NextAuth) con proveedor GitHub OAuth; sesión como JWT firmado, sin
  contraseñas propias que gestionar.
- **Tokens de acceso al MCP**: personal access tokens generados por el backend, con scopes
  (`read`/`write`/`delete`) y dueño asociado. Se muestran en texto plano una sola vez al crearlos
  (como un PAT de GitHub); en la base de datos solo se guarda su hash (bcrypt/argon2), nunca el
  token real — así una fuga de la base de datos no expone tokens usables.
- **Servidor MCP**: SDK oficial de TypeScript (`@modelcontextprotocol/sdk`), expuesto como route
  handler HTTP/SSE dentro del mismo proyecto Next.js. Si el límite de duración de las funciones
  serverless (Vercel Hobby, streaming largo) da problemas, se mueve solo esa ruta a un servicio
  Node aparte (ej. Render free) sin cambiar de lenguaje ni reescribir lógica.
- **Seguridad transversal**:
  - Lectura pública sin autenticación; toda escritura exige token válido + scope correcto + ser
    dueño del recurso (las tres condiciones, no basta una).
  - CORS restringido en las rutas de escritura del panel; las rutas de lectura pública quedan
    abiertas.
  - Rate limiting básico por IP en endpoints públicos, solo para mitigar abuso obvio (no es un
    sistema de rate limiting avanzado, eso sigue fuera de alcance).
  - Secrets (cadena de conexión a la base de datos, client secret de GitHub OAuth) viven en
    variables de entorno del hosting, nunca en el repositorio.
  - HTTPS impuesto por el propio hosting (Vercel) por defecto.
- **Testing**: Vitest (+ React Testing Library para componentes) en el mismo proyecto.
- **Gestor de paquetes**: pnpm.
- **CI/CD**: los workflows de GitHub Actions para validar/versionar skills se mantienen igual;
  se agrega un workflow de typecheck + lint + test para el propio proyecto Next.js en cada PR.
- **Hosting**: Vercel (app), Neon/Supabase (Postgres), ambos con free tier suficiente para el MVP.

## Fases de implementación (roadmap)

Ritmo asumido: **proyecto de fines de semana / ratos libres** — cada fase está pensada para
completarse en una sesión corta o un fin de semana, no en semanas. Son **fases chicas y muchas**,
a propósito, para tener un avance visible seguido en vez de bloques grandes que se estancan.

0. **Esqueleto del proyecto** — Next.js + TypeScript + Tailwind inicializado, deploy "hola mundo"
   funcionando en Vercel. Objetivo: tener algo desplegado desde el día 1, aunque no haga nada.
1. **Diseño visual con Stitch (vía MCP), antes de programar UI** — generar mockups de las
   pantallas clave (catálogo, detalle de skill, login, panel admin) usando Stitch para ver cómo se
   va a ver el producto y decidir la línea visual antes de escribir un solo componente real.
   Iterar el diseño acá es barato; iterarlo después en código no.
2. **Modelo de datos + Prisma** — schema de `Skill`, `SkillVersion`, `Context`, `User`,
   `AccessToken`; migraciones contra Postgres (Neon/Supabase).
3. **Catálogo público de solo lectura** — leer las skills (de la carpeta `skills/` de este mismo
   repo) y mostrarlas en la web siguiendo el diseño de la Fase 1: listar, buscar, ver detalle y
   changelog. Sin login ni escritura todavía.
4. **GitHub Actions de validación** — lint, validar frontmatter de `SKILL.md`, semantic
   versioning, publicar tag/release y notificar al backend.
5. **Login (GitHub OAuth + JWT de sesión)** — el panel admin permite entrar con GitHub; todavía
   sin ninguna acción de escritura real detrás del login.
6. **Panel admin de escritura** — crear/editar las propias ideas y contextos, publicar las propias
   skills, atribución de dueño visible, ideas privadas por defecto.
7. **Tokens de acceso al MCP con scopes** — emitir/revocar tokens (`read`/`write`/`delete`) desde
   el panel, guardados con hash, nunca en texto plano.
8. **Servidor MCP de solo lectura** — `list_skills`, `search_skills`, `get_skill`, `get_version`,
   `check_updates`, `list_contexts`/`get_context`, y la herramienta de "traer todo mi setup".
9. **Servidor MCP de escritura, protegido por scope + dueño** — `create_context`,
   `update_context`, `delete_context`, `publish_skill`, `delete_skill`.
10. **Contadores de popularidad** — descargas e instalaciones, mostrados en card y detalle.
11. **Casos borde de seguridad y pulido** — slugs duplicados entre dueños, archivado de cuentas
    borradas, revocación instantánea de tokens, rate limiting básico por IP.

Son **12 fases** (0 a 11). El orden importa: cada una deja algo demostrable antes de pasar a la
siguiente, y el diseño (Fase 1) va antes que cualquier pantalla real para no repetir trabajo de UI.

## Criterios de éxito

- Desde una sesión nueva de Claude Code sin contexto previo, una sola llamada MCP autenticada trae
  las skills e ideas de contexto del usuario, sin ningún paso manual de instalación o copiado.
- Un intento de escritura vía MCP sin token válido (o con un token que no es del dueño) es
  rechazado (401/403), verificado con al menos un caso de prueba automatizado.
- Un token con scope `read` que intenta llamar una herramienta de `write` o `delete` es rechazado
  (403) sin ejecutar ningún cambio, verificado con un caso de prueba por cada scope.
- Un usuario público (sin login) puede buscar y ver una skill o contexto en la web, pero no puede
  ver ni acceder al panel administrativo ni a las rutas de escritura de la API.
- Un cambio publicado en `SKILL.md` vía `git push` se refleja en la versión mostrada por la web y
  por el MCP en menos de 5 minutos (tiempo del pipeline de GitHub Actions), igual que en la v1.
- El login al panel admin usa JWT con expiración configurable, y el token puede revocarse desde el
  propio panel sin necesidad de un deploy.
- Un usuario A con token de scope `write` no puede editar ni borrar una skill o contexto cuyo
  dueño es el usuario B, verificado con un caso de prueba automatizado.
- El contador de descargas/instalaciones de una skill se incrementa correctamente al usar el botón
  "Descargar" en la web y al ejecutar el comando de instalación vía MCP, y ambos se ven reflejados
  en el detalle de la skill.

## Casos borde a contemplar

- `SKILL.md` con frontmatter incompleto o YAML mal formado: el pipeline debe fallar la validación,
  no publicar una versión rota.
- Cambio de versión que no sigue Semantic Versioning: el pipeline debe rechazarlo.
- Token de MCP filtrado o comprometido: el panel admin debe permitir revocarlo y emitir uno nuevo
  de inmediato, sin invalidar el resto de la cuenta.
- Contexto (idea o referencia externa) sin ninguna versión/actualización todavía: la web y el MCP
  deben mostrarlo igual, sin romper la vista de "detalle".
- Búsqueda sin resultados (skill o contexto): estado vacío explícito, no una lista en blanco.
- GitHub API caída o con rate limit alcanzado: el backend responde con los últimos datos cacheados
  en PostgreSQL en vez de fallar toda la petición.
- Alguien intenta llamar una herramienta MCP de escritura sin autenticarse, o con un token de otro
  usuario: debe rechazarse con un mensaje de error claro, sin exponer si el recurso existe o no.
- Un token con scope solo `read`/`write` (sin `delete`) intenta borrar una skill o contexto: se
  rechaza aunque el token sea válido y del dueño — el scope faltante bloquea la acción puntual, no
  solo la identidad.
- El dueño revoca o reduce el scope de un token mientras hay una sesión de Claude Code activa
  usándolo: la siguiente llamada con ese token debe respetar el nuevo scope de inmediato, no el
  que tenía cuando se emitió.
- JWT expirado a mitad de una sesión del panel admin: debe pedir reautenticación en vez de fallar
  en silencio o dejar una sesión a medias.
- Dos usuarios distintos intentan publicar una skill con el mismo nombre/slug: el registro debe
  rechazar el duplicado o namespacearlo por dueño (ej. `usuarioA/mi-skill` vs `usuarioB/mi-skill`),
  nunca sobrescribir silenciosamente la del otro dueño.
- Un usuario borra su cuenta (o revoca el acceso OAuth): sus skills/contextos públicos **se
  archivan, no se borran** — quedan visibles e instalables, marcados como "sin dueño activo", y
  dejan de aceptar ediciones hasta que alguien las adopte (fuera de alcance del MVP definir cómo).
  Sus ideas privadas sí se eliminan junto con la cuenta, al no ser visibles para nadie más.

## Supuestos y riesgos abiertos

<!-- REVISAR: valida estos supuestos antes de empezar a construir. -->

- El stack se decidió como monolito Next.js/TypeScript (en vez de Angular + Spring Boot) para
  minimizar costo de hosting y compartir lenguaje con el MCP; el riesgo abierto es si el free tier
  de Vercel soporta bien la conexión HTTP/SSE del MCP en sesiones largas — si no, se mueve esa
  única ruta a un servicio Node aparte (ver Stack técnico).
- El modelo "dueño del recurso decide quién más edita" asume que casi nunca hace falta que dos
  personas administren la misma skill al mismo tiempo; si en el futuro se necesita coedición real
  (varios dueños de un mismo recurso), hoy no hay diseño para eso.
- Con GitHub OAuth, el dueño de un recurso en la plataforma es la cuenta de GitHub que lo publicó
  desde el panel — no necesariamente la misma cuenta/org que aparece como dueña del repositorio en
  GitHub si alguien publica una skill de un repo ajeno. Falta decidir si se valida que solo el
  dueño real del repo (o alguien con permiso en él) pueda publicarla en el registro.
- El contador de "instalaciones vía npx/CLI" solo puede llenarse si el propio comando de
  instalación reporta el evento a este backend — un `npx <paquete> add owner/repo` genérico de un
  tercero no avisa nada automáticamente. Falta decidir si el registro tiene su propia CLI de
  instalación (que sí reporte) o si ese contador se limita a las descargas hechas desde la web.
- "Aparte de MCP podría ser otras cosas" quedó sin especificar en la conversación con el usuario —
  no se diseña ningún canal adicional hasta que el usuario concrete cuál.
- Se asume que las "ideas" y "referencias de contexto" (superpowers, context7, herdr, etc.) se
  guardan como metadata simple (texto + links) en PostgreSQL, sin necesidad de sincronizarlas
  también contra GitHub como source of truth — a diferencia de las skills. Validar si el usuario
  quiere que estas también vivan versionadas en el repo.
- Riesgo principal (heredado del PRD anterior): la integración correcta entre GitHub, backend,
  CI/CD y MCP —ahora con autenticación de por medio— es más compleja que las pantallas de la web;
  necesita su propio spike de diseño antes de comprometer fechas.

## Historial de cambios

El PRD original se completó con los ítems #1-#14 del backlog. Cambios de alcance agregados
después, una vez el MVP ya implementado:

- **2026-10-01** — Visibilidad pública/privada por skill (antes solo existía para ideas),
  desactivar/pausar una skill sin borrarla, y advertencia de borrado distinta según visibilidad
  (ver Alcance). Afecta el modelo de datos (`Skill`) y las tools MCP `publish_skill`/`update_skill`
  además del panel — **implementado** (ADR-0011, ítem #16 del backlog).
- **2026-10-05** — Creación de skills por contenido completo como flujo principal del panel (no
  solo al editar), y filtro heurístico de prompt injection integrado al validador compartido,
  aplicado en los tres caminos de publicación — ver ADR-0016.
- **2026-10-04** — Paginación (ventana de 5 ítems) y selección múltiple (traer varias skills de
  una vez) en el comando `tui` del CLI — ver ADR-0013, revisión 2026-10-04.
- **2026-10-04** — Grupos (colecciones) de skills: armables desde el panel web, traíbles de una
  sola vez desde el CLI/`tui` en cualquier otro proyecto — ver ADR-0015.
- **2026-10-04** — Formato estricto de skill (frontmatter + 6 secciones obligatorias del body) y
  gestión del catálogo propio: panel y MCP ahora aceptan el contenido completo de una skill (no
  solo metadata), validado contra una plantilla única y estricta — ver ADR-0014. Cierra el hueco
  dejado por ADR-0013 (que explícitamente dejaba `publish_skill` como "solo metadata, no
  contenido" — ya no aplica).
- **2026-10-02** — CLI interactivo para listar/elegir/traer skills y agentes propios a cualquier
  proyecto, usable desde cualquier IA o editor que hable MCP (Claude Code, Antigravity, OpenCode,
  etc.), no solo Claude Code — ver ADR-0013. **Implementado** (ítem #17 del backlog). Como efecto
  colateral, el contenido de cada skill ahora se guarda completo en Postgres al momento de la
  ingesta, lo cual además destraba parcialmente el punto abierto de arriba sobre las 13 skills de
  ejemplo: el flujo de "traer una skill" ya no depende de que el `repository` original siga siendo
  accesible — aplica a partir de la próxima vez que cada skill se re-publique (las versiones ya
  ingeridas antes de este cambio no tienen contenido retroactivo).
- **2026-10-01** — Separación entre el código fuente de la plataforma y las skills publicadas por
  la comunidad (ver ADR-0012 en TECH-DESIGN.md): el repositorio del registry (`JoseEM26/skill-store`)
  pasó a **privado**, para proteger el código del producto en sí. El campo `repository` de cada
  skill publicada por la comunidad debe apuntar al repo propio de su dueño, nunca al repo de la
  plataforma — las 13 skills de ejemplo usadas para poblar el catálogo durante el desarrollo
  apuntaban (por comodidad, no por diseño) al propio repo de la plataforma; falta decidir qué hacer
  con esas skills de ejemplo cuando haya contenido real de la comunidad (dejarlas como demo interna,
  o reemplazarlas/actualizar su `repository`).
- **2026-10-01** — Abierto, sin decidir todavía: **modelo de licencia por skill**. Hoy las 13 skills
  de ejemplo declaran `license: MIT` (reuso libre, estilo npm/GitHub). Falta decidir si ese sigue
  siendo el default para la comunidad, o si cada dueño puede elegir una licencia más restrictiva
  (ej. "All rights reserved") al publicar — importante: ninguna licencia impide que alguien que
  instala una skill pública *tenga* el código (eso es inherente a "instalar"); la licencia solo
  define qué puede hacer legalmente con él después (redistribuir, modificar, vender, etc.).
