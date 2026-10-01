# Proposal

## Why
Los endpoints públicos (catálogo, descarga de skills, tools públicas de MCP) operan sin autenticación obligatoria y son susceptibles a scraping abusivo o saturación de tráfico. Siguiendo ADR-0007, es necesario implementar un rate limiting básico por IP con contador de ventana deslizante en Postgres y purga periódica para mitigar abusos sin añadir dependencias de servicios externos como Redis.

## What Changes
- Creación de la estructura de datos en Postgres para registrar eventos de acceso por IP y ruta (`RateLimitHit`: `ip`, `endpoint`, `createdAt`).
- Middleware / helper de validación de rate limit por IP que computa las solicitudes dentro de una ventana temporal deslizante y responde con `429 Too Many Requests` cuando se excede el umbral.
- Rutina periódica de purga que elimina los registros anteriores a la ventana deslizante activa para mantener acotado el tamaño de la tabla en Postgres.

## Capabilities

### New Capabilities
<!-- Ninguna capability nueva -->

### Modified Capabilities
- `data-model`: Incorpora los requisitos de persistencia temporal de peticiones por IP/endpoint, evaluación de ventana deslizante y purga automática de registros obsoletos.

## Impact
- **Base de Datos / Prisma**: Nueva tabla/modelo `RateLimitHit` con índices compuestos optimizados sobre `(ip, endpoint, createdAt)`.
- **API / Middleware**: Integración del guard de rate limit en route handlers públicos y llamadas al MCP.
- **Mantenimiento**: Endpoint / script de purga periódica de registros antiguos fuera de ventana.
