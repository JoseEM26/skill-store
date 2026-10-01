# ADR 0005: Manejo de estado

## Estado

Aceptado

## Contexto

El catálogo público necesita búsqueda/filtrado, y el panel admin necesita formularios de escritura
(crear/editar ideas, contextos, tokens, skills). El monolito ya es Next.js App Router (ADR 0001), y
la fuente de verdad de los datos es Postgres vía Prisma.

## Decisión

Los datos viven en el servidor: React Server Components leen directo de Postgres (vía Prisma) en
cada request, y los filtros/búsqueda del catálogo son query params en la URL (re-render
server-side, sin JS de estado global en el cliente). Los formularios de escritura del panel admin
usan Server Actions. No se introduce ningún store cliente global.

## Alternativas consideradas

- **SWR solo en el buscador del catálogo** — evita recargar la página completa en cada tecla del
  buscador, pero agrega una dependencia y una segunda vía de fetching (cliente + servidor) para un
  catálogo que hoy no tiene volumen que lo justifique. Se descarta para el MVP; queda como mejora
  simple de agregar después si la búsqueda por URL se siente lenta en uso real.
- **Store global cliente (Zustand/Redux)** — pensado para estado complejo compartido entre
  componentes cliente lejanos entre sí; el catálogo y el panel admin no tienen ese caso, sería una
  dependencia y una capa sin uso real detrás.

## Consecuencias

- Cero estado cliente que sincronizar con el servidor: menos bugs de datos desactualizados, menos
  JS enviado al navegador.
- Cada cambio de filtro/búsqueda dispara un round-trip completo al servidor (no hay actualización
  optimista ni fetch incremental en el cliente) — aceptable para el volumen esperado de un catálogo
  de skills, se revisita solo si la latencia real lo justifica.
