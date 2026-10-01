# ADR 0007: Rate limiting básico por IP

## Estado

Aceptado

## Contexto

El PRD (Stack técnico, Seguridad transversal) exige rate limiting básico por IP en endpoints
públicos, solo para mitigar abuso obvio. Las funciones serverless de Vercel no mantienen memoria
entre invocaciones, así que un contador en RAM no es viable — el conteo necesita un almacenamiento
persistente compartido entre invocaciones.

## Decisión

Un contador de ventana deslizante en Postgres: una tabla que registra requests por IP/endpoint con
timestamp, consultada y actualizada en cada request público para decidir si se bloquea. Un cron job
periódico (Vercel Cron, incluido en el free tier) borra las filas fuera de la ventana activa, para
que la tabla no crezca sin límite bajo tráfico de abuso sostenido — sin sumar una operación de
borrado extra a cada request público.

## Alternativas consideradas

- **Upstash Redis + `@upstash/ratelimit`** — estándar del ecosistema Vercel/Next.js para este caso,
  sin agregar carga a la misma base de datos de la app. Se descartó a favor de no sumar un servicio
  externo nuevo (Redis) cuando ya existe Postgres como única base de datos del proyecto.

## Consecuencias

- Sin servicio ni dependencia externa nueva — todo el estado de la app, incluido el rate limiting,
  vive en la misma base Postgres/Neon.
- Cada request público suma una escritura/lectura extra a la misma base de datos que ya opera bajo
  los límites de conexión del free tier de Neon, compitiendo por esas conexiones con la carga real
  de la app (catálogo, MCP). Si el volumen de tráfico crece, este es el primer punto a revisar antes
  de escalar el resto del sistema.
