# Design

## Context

El servidor MCP (implementado en el ítem #9) expone actualmente herramientas de lectura del catálogo. Para soportar flujos de trabajo autónomos donde los agentes gestionen notas o skills, se incorporan herramientas de mutación conectadas a la base de datos local Postgres vía Prisma y protegidas por los tokens de acceso del ítem #8.

## Goals / Non-Goals

**Goals:**
- Registrar tools de mutación en el servidor MCP: `create_context`, `update_context`, `delete_context`, `publish_skill`, `delete_skill`.
- Aplicar de forma estricta la regla transversal de tres condiciones: token válido + scope requerido (`write` o `delete`) + verificación de propiedad del recurso (`ownerId === token.ownerId`).
- Derivar siempre el `ownerId` del token validado, ignorando cualquier intento de suplantación en los argumentos de la tool.
- Validar esquemas Zod en todas las entradas de mutación.

**Non-Goals:**
- Contadores de descarga o instalación automáticos (corresponde a #11).
- Manejo de borrado de cuenta en cascada (corresponde a #13).

## Decisions

### 1. Wrapper de autorización para herramientas MCP (`withAuthenticatedTool`)
- **Decisión**: Envolver los tool handlers de escritura en una función de orden superior `withAuthenticatedTool(requiredScope, handler)` que:
  1. Extrae el token de la solicitud MCP.
  2. Ejecuta `validateAccessToken(token, requiredScope)`.
  3. Pasa el `ownerId` verificado directamente al handler de la operación.
- **Razón**: Centraliza la validación criptográfica y de scopes, evitando omisiones involuntarias de seguridad en cada herramienta.

### 2. Separación explícita de scopes `write` vs `delete`
- **Decisión**: Las herramientas `delete_context` y `delete_skill` exigen estrictamente el scope `delete`. La presencia únicamente del scope `write` provocará un rechazo 403.
- **Razón**: Cumple estrictamente con el PRD y los criterios de aceptación donde el dueño puede otorgar tokens de edición a colaboradores sin concederles capacidad de eliminación.

### 3. Mutaciones atómicas filtradas por `ownerId`
- **Decisión**: Todas las operaciones de actualización y borrado en Prisma ejecutan cláusulas `where: { id: args.id, ownerId: tokenOwnerId }`.
- **Razón**: Previene vulnerabilidades de modificación de recursos de terceros y simplifica la detección de autorización fallida si el conteo de filas afectadas es cero.

### 4. Reglas de visibilidad en creación de contextos
- **Decisión**: En `create_context`, si `type === 'idea'`, `isPublic` toma el valor `false` por defecto (a menos que se indique `true`). Si `type === 'external_reference'`, `isPublic` se fuerza a `true` y se exige `link`.

## Risks / Trade-offs

- **[Inyección de argumentos maliciosos en MCP]** → Mitigación: Cada tool valida su payload con Zod antes de alcanzar la lógica de base de datos.
- **[Exposición accidental de existencia de recursos ajenos]** → Mitigación: Si una consulta de actualización o borrado sobre un recurso ajeno falla, se devuelve un error genérico (403/404) sin filtrar si el ID existe en otra cuenta.
