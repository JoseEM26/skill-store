# Proposal

## Why

El proyecto es greenfield: no existe todavía repositorio de código. Antes de construir cualquier
capability real (modelo de datos, catálogo, auth), hace falta el esqueleto técnico — proyecto
Next.js inicializado con el stack decidido en ADR-0001 — corriendo en local. El desarrollo avanza
100% local por ahora; la conexión a Vercel y Neon (ADR-0008) se hace en un ítem posterior del
backlog, cuando el usuario tenga esas cuentas listas para conectar — no bloquea escribir código.

## What Changes

- Inicializar un proyecto Next.js (App Router) en TypeScript, según ADR-0001.
- Configurar Tailwind CSS (estilos del stack, PRD → Stack técnico).
- Configurar el gestor de paquetes pnpm (PRD → Stack técnico).
- Página placeholder ("hola mundo") corriendo localmente vía `pnpm dev`, sin ninguna
  funcionalidad real todavía.

No incluye: modelo de datos, Prisma, autenticación, ninguna ruta de API o MCP, ni la conexión a
Vercel/Neon — eso empieza en ítems posteriores del backlog (`BACKLOG.md`), una vez que el usuario
tenga las cuentas de GitHub/Vercel/Neon listas para conectar.

## Capabilities

Sin capabilities nuevas ni modificadas. Este cambio es scaffolding de proyecto puro — no introduce
ningún comportamiento observable del sistema más allá de "el deploy responde" (el propio PRD lo
describe como un deploy "aunque no haga nada"). Ver `skip_specs: true` en `.openspec.yaml`.

## Impact

- **Código**: crea el proyecto Next.js desde cero (no existía código previamente).
- **Infraestructura**: ninguna todavía — sin Vercel, sin Neon/Postgres, sin git remoto. Se conecta
  en un ítem posterior del backlog cuando el usuario tenga esas cuentas listas.
- **Dependencias**: Next.js, TypeScript, Tailwind CSS, pnpm como gestor de paquetes.
- **CI/CD**: ninguno todavía — el workflow de typecheck/lint/test para este proyecto se agrega
  junto con el resto del pipeline en un ítem posterior del backlog, no aquí.
