# Tasks

## 1. Base de Datos: Modelo RateLimitHit y Migración Local

- [ ] 1.1 Agregar el modelo `RateLimitHit` con índices compuestos `(ip, endpoint, createdAt)` en `prisma/schema.prisma` y ejecutar la migración contra el Postgres local en Docker (`npx prisma migrate dev`), verificando la creación de la tabla en Postgres.
- [ ] 1.2 Generar el cliente de Prisma actualizado y verificar que los tipos de `RateLimitHit` estén disponibles en TypeScript.

## 2. Lógica de Rate Limiting y Guards

- [ ] 2.1 Implementar el helper `checkRateLimit(ip, endpoint, options)` que consulte la ventana deslizante y registre el hit en Postgres, y verificar mediante tests unitarios en Vitest para escenarios permitidos y excedidos.
- [ ] 2.2 Integrar el guard de rate limiting en los route handlers públicos y llamadas al MCP, y verificar respuestas HTTP `429 Too Many Requests` cuando se sobrepasa el límite configurado.

## 3. Purga Periódica y Mantenimiento

- [ ] 3.1 Implementar la función de purga `purgeExpiredRateLimits(maxAgeMs)` para eliminar registros antiguos fuera de la ventana activa, y verificar mediante tests unitarios en Vitest que se eliminen únicamente filas caducadas.
- [ ] 3.2 Exponer un endpoint interno / script de mantenimiento para invocar la purga de rate limit, verificando la depuración en base de datos local.
