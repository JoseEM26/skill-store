# ADR 0004: Contratos de API

## Estado

Aceptado

## Contexto

El PRD ya especifica "API REST para skills y contextos" en Alcance. La API la consumen múltiples
clientes externos, no solo el propio frontend Next.js: la web pública, el servidor MCP y,
potencialmente, herramientas de terceros (CLI de instalación). El monolito y el MCP comparten
lenguaje (TypeScript) y validación (Zod), definidos en ADR 0001.

## Decisión

Contrato REST, validado con Zod en cada endpoint. Las rutas de Next.js (route handlers) son dueñas
del contrato; el servidor MCP, al vivir dentro del mismo monolito, reutiliza los mismos schemas Zod
para validar sus tools sin duplicar definiciones.

Como el slug de una skill es único solo por dueño (ADR-0003: `usuarioA/mi-skill` y
`usuarioB/mi-skill` pueden coexistir), las rutas de recurso incluyen siempre el dueño:
`/api/skills/{owner}/{slug}` (y equivalente para sus versiones), nunca `/api/skills/{slug}` a
secas — evita la ambigüedad de dos dueños con el mismo slug.

## Alternativas consideradas

- **tRPC** — type-safety end-to-end sin exponer un schema REST, pero solo funciona cuando cliente y
  servidor comparten el mismo repo TypeScript. Los consumidores externos (MCP como cliente de
  terceros, herramientas de instalación) no pueden consumir tRPC directamente — habría que exponer
  REST de todos modos por fuera, duplicando el trabajo.
- **GraphQL** — un único endpoint flexible, pero agrega una capa de resolvers y schema que este
  catálogo (listar, buscar, obtener detalle, versiones) no necesita — sobre-ingeniería para el caso
  de uso real.

## Consecuencias

- Un solo contrato REST documentable y consumible por cualquier cliente externo, con Zod
  garantizando que MCP y API pública nunca validen distinto para el mismo recurso.
- REST implica más endpoints explícitos que un único endpoint GraphQL/tRPC — aceptado porque el
  catálogo tiene pocas formas de consulta (listar/buscar/detalle/versión), no una necesidad real de
  queries arbitrarias.
