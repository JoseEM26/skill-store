# ADR 0017: Confirmación explícita antes de borrar una skill vía MCP

## Estado

Aceptado

## Contexto

`delete_skill` (MCP, `src/lib/mcp/tools.ts`, ítem #10 del backlog) borra la skill de inmediato en
cuanto se llama, sin ningún paso intermedio — a diferencia del panel (`/admin/skills`), que ya
muestra un modal de confirmación antes de borrar (`SkillList.tsx`, con texto distinto según
`isPublic`, ver ADR-0011).

El usuario confirmó que el flujo de creación/edición de skills iniciado por un agente de IA vía
MCP (`publish_skill`) ya queda cubierto por ADR-0011 (nace siempre privada). Pidió además que,
cuando un agente de IA llame a `delete_skill`, el sistema "pregunte si está seguro" antes de borrar
— un borrado es irreversible y no debería ejecutarse en el primer intento sin una confirmación
explícita, igual que ya pasa en el panel.

MCP es un protocolo de llamada a función sin estado de sesión ni diálogo nativo — no hay un modal
que el servidor pueda mostrar. El equivalente server-side de "preguntar si está seguro" es un
patrón de **confirmación en dos pasos**: la primera llamada sin confirmar devuelve un mensaje
explicando qué se va a borrar y pide repetir la llamada con un flag de confirmación; solo la
segunda llamada (con el flag) ejecuta el borrado real. El agente de IA que llama a la tool es quien
debe trasladarle esa pregunta a su usuario humano antes de reintentar.

## Decisión

- `deleteSkillMcpSchema` (`src/lib/validations/mcp.ts`) agrega un campo opcional
  `confirm: z.boolean().optional().default(false)`.
- `handleDeleteSkill` (MCP):
  - Si `confirm !== true`: **no borra nada**. Devuelve
    `{ success: false, requiresConfirmation: true, id, slug, name, isPublic, message }`, con
    `message` explicando qué skill se va a borrar y aclarando, igual que ya hace el modal del panel
    (ADR-0011), la diferencia entre skill pública (terceros que ya la instalaron conservan su
    copia) y privada (no hay copias de terceros) — y pidiendo repetir la llamada con
    `confirm: true` para confirmar.
  - Si `confirm === true`: procede exactamente como hoy (borra y devuelve el mensaje de éxito
    actual).
- No se toca `update_skill`/`publish_skill` (ni crear ni actualizar) — el pedido es específico
  sobre el borrado, que es la única operación irreversible de las tres.
- Mismo patrón aplicable en el futuro a cualquier otra tool MCP destructiva que se agregue (ej.
  `delete_context`), aunque esta ADR solo cubre `delete_skill` — el pedido del usuario fue
  específicamente sobre skills.

## Alternativas consideradas

- **Requerir confirmación por fuera de banda** (ej. un código enviado por otro canal) — se
  descarta: excesivo para este caso, el patrón de dos llamadas ya resuelve el problema (evitar un
  borrado accidental de un solo tiro) sin fricción adicional real.
- **Un parámetro `dryRun` en vez de `confirm`** — mismo efecto invertido (default ejecuta, hay que
  pasar `dryRun: true` para solo simular); se descarta porque el default más seguro es que la
  tool NO borre nada a menos que se pida explícitamente, no al revés.

## Consecuencias

- Cualquier cliente MCP existente que llamaba a `delete_skill` esperando que borre en el primer
  intento necesita actualizarse para mandar `confirm: true` — cambio de contrato, documentado acá
  y en el mensaje de error devuelto (que ya indica qué hacer).
- No cambia el modelo de datos ni la lógica de ownership/scopes ya existente — solo agrega un paso
  antes del `prisma.skill.delete`.
