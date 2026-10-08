# Technical Design Document: CloudCode Skills Registry

**Tipo de proyecto:** Greenfield.
**Design.md disponible:** No — el modelo de datos se derivó solo del PRD.

## Resumen

Registro central de skills, ideas propias y referencias de contexto (ver `PRD.md`), consultable
desde cualquier sesión nueva de Claude Code vía MCP. Se construye como un único monolito Next.js
(TypeScript) que sirve frontend, API REST y servidor MCP, con Postgres en Neon como única base de
datos y despliegue en Vercel free tier — ambas restricciones mandatorias del usuario.

## Arquitectura de componentes

Un único componente (ver ADR 0002): proyecto Next.js que sirve frontend, API REST y el route
handler de MCP, todos en el mismo repositorio y deploy. La base de datos Postgres en Neon es
compartida por todos: catálogo, tokens, y el contador de rate limiting.

## Decisiones de arquitectura

| # | Decisión | Estado |
|---|---|---|
| [ADR-0001](adrs/0001-stack-lenguaje-monolito.md) | Lenguaje y framework del monolito: TypeScript + Next.js | Aceptado |
| [ADR-0002](adrs/0002-componentes-monolito-unico.md) | Componentes / repos: un único monolito | Aceptado |
| [ADR-0003](adrs/0003-modelo-de-datos.md) | Modelo de datos | Aceptado |
| [ADR-0004](adrs/0004-contrato-api-rest.md) | Contrato de API: REST + Zod | Aceptado |
| [ADR-0005](adrs/0005-manejo-de-estado.md) | Manejo de estado: Server Components + Server Actions | Aceptado |
| [ADR-0006](adrs/0006-resiliencia-fallback-github.md) | Resiliencia: fallback a cache ante fallo de GitHub | Aceptado |
| [ADR-0007](adrs/0007-rate-limiting-postgres.md) | Rate limiting básico: contador en Postgres | Aceptado |
| [ADR-0008](adrs/0008-estrategia-despliegue.md) | Estrategia de despliegue: migraciones + previews con Neon branching | Aceptado |
| [ADR-0009](adrs/0009-contadores-sin-auth.md) | Contadores de popularidad: excepción pública a la regla de escritura | Aceptado |
| [ADR-0010](adrs/0010-hash-rapido-tokens.md) | Hash rápido (SHA-256) para tokens, en vez de bcrypt/argon2 | Aceptado |
| [ADR-0011](adrs/0011-visibilidad-y-pausado-de-skills.md) | Visibilidad pública/privada y pausado de skills | Aceptado |
| [ADR-0012](adrs/0012-repo-plataforma-privado.md) | Repositorio de la plataforma privado, separado del código de cada skill | Aceptado |
| [ADR-0013](adrs/0013-cli-instalacion-interactiva.md) | CLI interactivo multi-agente para listar/traer skills, contenido completo guardado en Postgres | Aceptado |
| [ADR-0014](adrs/0014-formato-estricto-de-skill-y-gestion-propia.md) | Formato estricto de skill (frontmatter + 6 secciones), carga de contenido completo desde panel y MCP | Aceptado |
| [ADR-0015](adrs/0015-grupos-de-skills.md) | Grupos (colecciones) de skills, gestionables desde el panel, traíbles de una vez vía CLI | Aceptado |
| [ADR-0016](adrs/0016-creacion-por-contenido-y-filtro-prompt-injection.md) | Creación de skill por contenido completo como flujo principal, filtro heurístico de prompt injection | Aceptado |
| [ADR-0017](adrs/0017-confirmacion-de-borrado-en-mcp.md) | Confirmación explícita (dos llamadas) antes de borrar una skill vía MCP | Propuesto |

## Modelo de datos

- **User** — `id`, `githubId`, `username`, `avatarUrl`, `createdAt`.
- **Skill** — `id`, `slug` (único por dueño), `name`, `description`, `ownerId → User`, `license`,
  `repositoryUrl`, `downloadsCount`, `installsCount`, `isArchived`, `isPublic`, `isPaused`,
  `createdAt`, `updatedAt` (ADR-0011, implementado — ítem #16).
- **SkillVersion** — `id`, `skillId → Skill`, `version` (semver), `changelog`, `gitTag`,
  `publishedAt`, `files Json?` (mapa ruta relativa → contenido completo del archivo; ADR-0013,
  implementado — ítem #17).
- **Context** — tabla única con discriminador `type` (`idea` | `external_reference`): `id`, `type`,
  `title`, `body`, `link` (nullable), `tags[]`, `ownerId → User`, `isPublic` (default `false` para
  `idea`), `isArchived`, `createdAt`, `updatedAt`. `CHECK` en Postgres: `external_reference` nunca
  puede ser privado.
- **AccessToken** — `id`, `ownerId → User`, `tokenHash` (SHA-256, no bcrypt/argon2 — ver ADR-0010),
  `scopes` (array de `read`/`write`/`delete`), `label`, `expiresAt` (nullable), `lastUsedAt`
  (nullable), `revokedAt` (nullable), `createdAt`.
- **SkillGroup** — `id`, `name`, `ownerId → User`, `createdAt`, `updatedAt` (ADR-0015,
  implementado — ítem #19).
- **SkillGroupItem** — `groupId → SkillGroup`, `skillId → Skill`, `addedAt` (tabla de unión
  muchos-a-muchos; ADR-0015, implementado — ítem #19).

Detalle completo y alternativas descartadas en [ADR-0003](adrs/0003-modelo-de-datos.md).

## Criterios de aceptación por flujo

### Traer setup completo vía MCP (sesión nueva)

- [ ] Con un token válido, una sola llamada MCP devuelve skills marcadas como relevantes + contextos
      (ideas propias + referencias) en una sola respuesta JSON.
- [ ] Sin token, la misma tool responde 401 sin exponer ningún dato privado.

### Publicar una skill (git push → CI/CD)

- [ ] `SKILL.md` con frontmatter inválido o YAML mal formado hace fallar el pipeline antes del
      tag/release.
- [ ] Un cambio de versión que no sigue semver es rechazado por el pipeline.
- [ ] Un push válido se refleja en la versión mostrada por la web y el MCP en menos de 5 minutos.

### Catálogo público (buscar/ver skill o contexto)

- [ ] Usuario sin login puede listar, buscar y ver detalle/changelog de skills y contextos
      públicos.
- [ ] Búsqueda sin resultados muestra estado vacío explícito, no una lista en blanco.
- [ ] Usuario sin login no puede acceder a `/admin` ni a ninguna ruta de escritura de la API
      (redirect o 401/403).

### Login (solo GitHub OAuth) + panel admin

- [ ] La única vía de login es GitHub OAuth — no existe registro con email/contraseña.
- [ ] Login exitoso emite JWT de sesión con expiración configurable.
- [ ] JWT expirado a mitad de sesión pide reautenticación, no falla en silencio.
- [ ] El dueño puede crear/editar sus propias ideas (default privadas) y contextos; otro usuario
      autenticado solo puede leerlos.

### Tokens de acceso con scopes

- [ ] Un token se muestra en texto plano una sola vez al crearse; en DB solo se guarda su hash.
- [ ] Un token con scope `read` que llama una tool de `write`/`delete` es rechazado (403) sin
      ejecutar ningún cambio.
- [ ] Revocar o reducir el scope de un token aplica desde la siguiente llamada, no la anterior.
- [ ] Un token con scope `write`/`delete` de un dueño no puede escribir sobre un recurso de otro
      dueño (403).

### Contadores de popularidad

- [ ] El botón "Descargar" en la web incrementa `downloadsCount` de esa skill sin requerir login.
- [ ] Ejecutar el comando de instalación vía MCP incrementa `installsCount` de esa skill, incluso si
      quien lo ejecuta no es el dueño de la skill.
- [ ] Ambos contadores se reflejan en el detalle de la skill inmediatamente después del evento.
- [ ] Un IP que excede el rate limiting general (ADR-0007) no puede seguir incrementando contadores,
      igual que con cualquier otro endpoint público.

### Modelo de datos (reglas de negocio)

- [ ] Un intento de crear o actualizar un `Context` con `type = external_reference` e
      `isPublic = false` es rechazado por el `CHECK` constraint de la base, no solo por validación
      de aplicación.
- [ ] Dos skills con el mismo `slug` pero distinto dueño (`usuarioA/mi-skill`, `usuarioB/mi-skill`)
      coexisten y cada una es direccionable sin ambigüedad vía `/api/skills/{owner}/{slug}`.
- [ ] Una skill sin ningún fetch exitoso a GitHub todavía responde con un error explícito
      ("metadata no disponible aún"), nunca con campos vacíos que parezcan datos válidos.

## Riesgos técnicos abiertos

- Soporte de Vercel free tier para conexiones HTTP/SSE largas del MCP: si el límite de duración de
  funciones serverless da problemas, esa única ruta se mueve a un servicio Node aparte (ver ADR
  0002).
- El rate limiting basado en Postgres (ADR 0007) compite por conexiones del free tier de Neon con
  la carga real de la app — primer punto a revisar si el tráfico crece antes de escalar el resto
  (la purga periódica vía cron acota el tamaño de la tabla, pero no la competencia por conexiones).
- Los contadores de popularidad (ADR 0009) no tienen garantía criptográfica de representar
  instalaciones reales — solo están acotados por el rate limiting general por IP, aceptado porque
  son contadores informativos, no una señal de confianza crítica del sistema.
- El dueño de un recurso es la cuenta de GitHub que lo publicó desde el panel, no necesariamente la
  misma cuenta/org dueña del repositorio en GitHub si se publica una skill de un repo ajeno — sin
  validación de permisos sobre el repo real todavía (heredado del PRD).
- El contador de instalaciones vía `npx`/CLI solo se llena si el propio comando de instalación
  reporta el evento a este backend — pendiente decidir si el registro tiene su propia CLI que
  reporte, o si el contador se limita a descargas desde la web (heredado del PRD).
