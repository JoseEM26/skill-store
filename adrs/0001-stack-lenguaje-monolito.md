# ADR 0001: Lenguaje y framework del monolito

## Estado

Aceptado

## Contexto

El proyecto es greenfield. El usuario impuso dos restricciones mandatorias: la base de datos debe
correr en Neon (Postgres serverless) y el despliegue debe ser en Vercel free tier. El PRD ya define
un servidor MCP construido con el SDK oficial de TypeScript (`@modelcontextprotocol/sdk`), expuesto
como route handler dentro del mismo proyecto — cualquier lenguaje distinto para el monolito
implicaría mantener dos stacks. El equipo es de una sola persona.

## Decisión

El monolito (frontend + API) se construye en TypeScript con Next.js (App Router).

## Alternativas consideradas

- **Python (FastAPI o Django)** — Django ofrece admin panel gratis y ecosistema maduro, pero el
  runtime Python en Vercel es beta/comunitario, pensado para funciones serverless sueltas y no para
  un monolito frontend+API como el que exige el PRD. Además obligaría a dos lenguajes distintos
  (Python para el monolito, TypeScript para el MCP oficial), perdiendo la ventaja de compartir tipos
  y validación entre ambos.
- **Go (Fiber/Echo)** — arranques en frío casi nulos y binario único, pero el soporte de Go en
  Vercel es comunitario/limitado, no existe un framework equivalente a Next.js para servir
  frontend+API en un monolito, y el SDK de MCP en Go no es oficial.

## Consecuencias

- Un solo lenguaje y un solo set de tipos/validación (Zod) compartido entre web, API y servidor
  MCP, con deploy nativo y sin configuración extra en Vercel.
- En funciones serverless de Vercel no se puede mantener un pool TCP tradicional abierto hacia
  Postgres: hay que usar el driver serverless de Neon (`@neondatabase/serverless`, HTTP/WebSocket) o
  el connection pooler de Neon en vez de una conexión Prisma estándar, lo que agrega configuración
  adicional al setup de Prisma.
