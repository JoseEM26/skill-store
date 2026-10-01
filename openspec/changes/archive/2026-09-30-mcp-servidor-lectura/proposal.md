# Proposal

## Why

El objetivo central del registro es permitir que Claude Code y otros agentes de IA descubran e instalen skills, consulten notas de contexto y carguen todo el setup del desarrollador de forma programática. Este cambio implementa el servidor MCP integrado dentro del monolito con todas las herramientas de consulta y lectura del catálogo público, más la herramienta consolidada `get_my_setup` autenticada con token de acceso personal.

## What Changes

- Endpoint de servidor MCP (`/api/mcp`) en Next.js App Router utilizando `@modelcontextprotocol/sdk` con transporte HTTP/SSE.
- Herramientas de lectura de catálogo de skills:
  - `list_skills`: lista skills públicas con autor, slug, descripción y última versión.
  - `search_skills`: búsqueda por texto libre y tags sobre skills públicas.
  - `get_skill`: obtiene detalle completo de una skill por `{owner}/{slug}` y su historial de versiones.
  - `get_version`: obtiene el detalle de una versión específica (`version`, `changelog`, `gitTag`).
  - `check_updates`: verifica si existe una versión más reciente para una skill y versión dada.
- Herramientas de lectura de contextos:
  - `list_contexts`: lista referencias externas públicas y, si se provee un token válido con scope `read`, incluye las ideas privadas del dueño del token.
  - `get_context`: obtiene un contexto por ID, permitiendo acceso a ideas privadas únicamente si se presenta un token válido de su dueño.
- Herramienta de inicialización de sesión ("Traer todo mi setup"):
  - `get_my_setup`: exige token válido con scope `read` y devuelve en una única llamada JSON todas las skills y contextos del usuario autenticado para inicializar sesiones de Claude Code sin pasos manuales.

## Capabilities

### New Capabilities
- `servidor-mcp-lectura`: Servidor Model Context Protocol (MCP) con herramientas de consulta pública del catálogo de skills/contextos y herramienta autenticada `get_my_setup` para inicialización de entorno en una sola llamada.

### Modified Capabilities
<!-- No se modifican los requerimientos del modelo de datos base ya existente en data-model. -->

## Impact

- **Transporte / Endpoints**: Route handler `/api/mcp` en Next.js App Router para soportar SSE / HTTP JSON-RPC de MCP.
- **Dependencias**: Adición de `@modelcontextprotocol/sdk`.
- **Integración con Auth**: Uso de `validateAccessToken` (del ítem #8) para autorizar `get_my_setup` y el acceso a ideas privadas.
