# ADR 0002: Componentes / repos

## Estado

Aceptado

## Contexto

El PRD ya fija en Alcance y Stack técnico un monolito Next.js que sirve frontend + API en un solo
proyecto/deploy, con el servidor MCP expuesto como route handler dentro del mismo proyecto. El
despliegue es en Vercel free tier, donde operar un segundo servicio implica un segundo runtime a
pagar/mantener. Equipo de una sola persona.

## Decisión

Un único componente: proyecto Next.js que sirve frontend, API REST y el route handler de MCP,
todos en el mismo repositorio y el mismo deploy.

## Alternativas consideradas

- **MCP como servicio Node separado** — evita el límite de duración de funciones serverless de
  Vercel en conexiones HTTP/SSE largas, pero exige un segundo runtime a operar y pagar (fuera de
  Vercel free tier) para un proyecto de una sola persona sin necesidad confirmada todavía. Ya quedó
  registrado como riesgo abierto en el PRD — se revisita si el límite de Vercel da problemas reales,
  no se decide preventivamente.

## Consecuencias

- Un solo deploy, un solo repo, cero costo adicional de infraestructura en el free tier.
- Si el límite de duración de funciones serverless de Vercel afecta las sesiones MCP largas, migrar
  esa única ruta a un servicio aparte requiere un cambio de arquitectura no trivial (aunque no de
  lenguaje, según quedó anotado en el Stack técnico del PRD).
