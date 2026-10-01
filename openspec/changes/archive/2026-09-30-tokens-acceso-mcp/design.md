# Design

## Context

El servidor MCP y las llamadas a la API requieren autenticación granular mediante tokens personales asociados a un usuario. El schema de Prisma (`AccessToken`) ya define `ownerId`, `tokenHash`, `scopes`, `label`, `expiresAt`, `lastUsedAt`, `revokedAt`. Siguiendo ADR-0010, los tokens se hashean con SHA-256 rápido para evitar penalizar la latencia en funciones de servidor.

## Goals / Non-Goals

**Goals:**
- Generar tokens aleatorios criptográficamente seguros con prefijo `ccs_`.
- Almacenar el hash SHA-256 en Postgres garantizando que el token raw nunca quede guardado en base de datos.
- Proveer interfaz en `/admin/tokens` para listar tokens del usuario, crear nuevos tokens con scopes seleccionables (`read`, `write`, `delete`) y revocar tokens activos.
- Implementar el helper central de autenticación y autorización `validateAccessToken(rawToken, requiredScope)` que valida existencia, expiración, revocación y permisos de scope.

**Non-Goals:**
- Implementación de los endpoints HTTP/SSE o herramientas del servidor MCP (corresponde a #9 y #10).
- Algoritmos lentos como bcrypt o argon2 (explícitamente descartados en ADR-0010).

## Decisions

### 1. Generación de token y formato con prefijo
- **Decisión**: Los tokens se generan usando `crypto.randomBytes(32).toString('hex')` precedido por el prefijo `ccs_` (ej. `ccs_a1b2c3...`).
- **Razón**: El prefijo permite identificar de inmediato el origen del secreto (detección de fugas en herramientas como secret scanners) y provee 256 bits de entropía.
- **Alternativa descartada**: UUIDs simples, que ofrecen menor entropía y carecen de prefijo identificable.

### 2. Criptografía con SHA-256 (ADR-0010)
- **Decisión**: Utilizar `crypto.createHash('sha256').update(rawToken).digest('hex')` para derivar `tokenHash`.
- **Razón**: Al ser tokens generados con 256 bits de entropía (no contraseñas elegidas por humanos), SHA-256 es completamente inmune a ataques de diccionario y se ejecuta en microsegundos, protegiendo los límites de tiempo de ejecución del MCP y API.

### 3. Ciclo de vida y revocación inmediata
- **Decisión**: La revocación actualiza el campo `revokedAt = new Date()`. La función de validación comprueba directamente en Postgres que `revokedAt` sea nulo y que la fecha de expiración no haya vencido.
- **Razón**: Garantiza que revocar un token tenga efecto inmediato en la siguiente invocación sin requerir invalidación de cachés distribuidas.

### 4. Flujo de revelación única en UI
- **Decisión**: El token en texto plano solo se devuelve como payload de respuesta de la Server Action al momento de la creación. Se muestra en un modal/banner con botón de copiado y una advertencia de que no volverá a mostrarse.

## Risks / Trade-offs

- **[Pérdida del token por parte del usuario]** → Mitigación: El usuario no puede recuperar el token perdido; debe revocarlo y generar uno nuevo.
- **[Sobrecarga de lecturas a Postgres en validación]** → Mitigación: Búsqueda indexada por `tokenHash` (`@unique`), con costo O(log N) casi instantáneo.
