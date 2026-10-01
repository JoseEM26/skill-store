# Tasks

## 1. Capa de autorización y esquemas para tools MCP

- [x] 1.1 Implementar wrapper de autorización `withAuthenticatedTool(requiredScope, handler)` en `lib/mcp/auth.ts` que valide token, scope y devuelva `ownerId`
- [x] 1.2 Declarar esquemas Zod en `lib/validations/mcp.ts` para argumentos de `create_context`, `update_context`, `delete_context`, `publish_skill` y `delete_skill`
- [x] 1.3 Escribir tests unitarios para `withAuthenticatedTool` validando que rechace llamadas sin token, con token revocado o con scope incorrecto

## 2. Tools MCP de mutación de contextos

- [x] 2.1 Implementar tool `create_context` (scope `write`) asignando `ownerId = token.ownerId`, default `isPublic: false` para ideas y `isPublic: true` para referencias externas
- [x] 2.2 Implementar tool `update_context` (scope `write`) aplicando modificaciones solo si `ownerId === token.ownerId`
- [x] 2.3 Implementar tool `delete_context` exigiendo estrictamente scope `delete` y validando propiedad del recurso
- [x] 2.4 Escribir tests automatizados para las tools de contexto verificando que un token con scope `write` sea rechazado al invocar `delete_context` (403) y que no se puedan alterar contextos de otros dueños

## 3. Tools MCP de mutación de skills

- [x] 3.1 Implementar tool `publish_skill` (scope `write`) que registre o actualice skills asociadas a `token.ownerId` y maneje colisiones de slug propio
- [x] 3.2 Implementar tool `delete_skill` (scope `delete`) que archive o elimine skills pertenecientes a `token.ownerId`
- [x] 3.3 Escribir tests automatizados para tools de skills verificando aislamiento por dueño y rechazo de eliminación con scope insuficiente

## 4. Verificación integral

- [x] 4.1 Ejecutar la suite completa de tests (`pnpm test`) verificando que todas las herramientas MCP de lectura y escritura cumplan con las especificaciones y reglas de seguridad
