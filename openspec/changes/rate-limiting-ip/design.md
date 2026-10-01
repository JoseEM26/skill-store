# Design

## Context
Ver `proposal.md` y `specs/data-model/spec.md`. De acuerdo con ADR-0007, el rate limiting se almacena en la misma base de datos Postgres (sin añadir Upstash Redis) mediante una ventana deslizante de timestamps y un proceso de purga periódica. Todo el desarrollo se ejecuta sobre el Postgres local en Docker (`skill_store_postgres`, puerto 5433).

## Goals / Non-Goals

**Goals:**
- Implementar un modelo `RateLimitHit` en Prisma con índices para consultas de rango eficientes por `(ip, endpoint, createdAt)`.
- Proveer un helper de rate limit reutilizable para middleware / route handlers públicos.
- Implementar una función y endpoint de mantenimiento para la purga de registros caducados.

**Non-Goals:**
- No integrar servicios externos como Redis o Cloudflare WAF (descartados en ADR-0007).
- No implementar reglas de rate limiting avanzadas ni bloqueos dinámicos por reputación de IP.

## Decisions

### 1. Estructura de tabla e índices en Prisma
- **Decisión:** Definir el modelo:
  ```prisma
  model RateLimitHit {
    id        String   @id @default(cuid())
    ip        String
    endpoint  String
    createdAt DateTime @default(now())

    @@index([ip, endpoint, createdAt])
  }
  ```
- **Razón:** El índice compuesto `(ip, endpoint, createdAt)` permite que `COUNT(*)` sobre `createdAt >= windowStart` sea una búsqueda en índice rápida.

### 2. Algoritmo de conteo en ventana deslizante
- **Decisión:** Calcular `windowStart = new Date(Date.now() - windowMs)` y consultar `prisma.rateLimitHit.count({ where: { ip, endpoint, createdAt: { gte: windowStart } } })`. Si `count >= maxRequests`, retornar status 429; de lo contrario, registrar la petición con `prisma.rateLimitHit.create`.
- **Razón:** Sencillez extrema y comportamiento preciso de ventana deslizante sin acumulación de buckets rígidos.

### 3. Estrategia de Purga
- **Decisión:** Implementar la función `purgeOldRateLimits(olderThanMs: number)` que ejecuta `prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: cutoffDate } } })`.
- **Razón:** Evita acumulación indefinida de filas sin ralentizar cada request individual con borrados inline.

## Risks / Trade-offs

- [Competencia de conexiones en Postgres bajo ráfagas de tráfico] → Mitigado con índices compactos y purgas periódicas. Registrado en TECH-DESIGN como compensación aceptada para mantener Postgres como único storage.

## Open Questions

- *Frecuencia de purga*: En desarrollo local puede ejecutarse bajo demanda o con un interval en background; en producción final se activará vía cron.
