# Design

## Context
Ver `proposal.md` y `specs/data-model/spec.md`. El schema de Prisma posee `isArchived` booleano en `Skill` y `Context`. Si un usuario borra su cuenta, ejecutar un `prisma.user.delete()` directo activaría `onDelete: Cascade` eliminando todas las skills y contextos públicos. Por ello se requiere un procedimiento orquestado y transaccional.

## Goals / Non-Goals

**Goals:**
- Implementar un servicio transaccional (`accountDeletionService`) que preserve skills y contextos públicos marcándolos `isArchived = true`.
- Borrar físicamente las ideas privadas (`Context` con `type = 'idea'` e `isPublic = false`) y los `AccessToken`.
- Proteger todas las rutas de mutación para que rechacen modificaciones sobre recursos archivados.

**Non-Goals:**
- No implementar flujos de adopción o transferencia de skills a otros dueños (explícitamente fuera de alcance en PRD para el MVP).
- No implementar un "papelera de reciclaje" con período de gracia para ideas privadas (el borrado de lo privado es inmediato).

## Decisions

### 1. Transacción orquestada con Prisma `$transaction`
- **Decisión:** Al solicitar la baja de cuenta, ejecutar en una sola transacción:
  1. `prisma.context.deleteMany({ where: { ownerId: userId, isPublic: false, type: 'idea' } })`
  2. `prisma.accessToken.deleteMany({ where: { ownerId: userId } })`
  3. `prisma.skill.updateMany({ where: { ownerId: userId }, data: { isArchived: true } })`
  4. `prisma.context.updateMany({ where: { ownerId: userId, isPublic: true }, data: { isArchived: true } })`
- **Razón:** Garantiza atomicidad; si falla algún paso no quedan estados inconsistentes. El registro de usuario se mantiene anonimizado/desactivado para mantener la integridad referencial de `ownerId`.
- **Alternativas consideradas:**
  - *Borrar User y poner ownerId nullable*: Requeriría cambiar el schema de Prisma y violaría el requisito de que todo recurso tiene un dueño (ADR-0003).

### 2. Bloqueo de escritura en recursos archivados
- **Decisión:** En cada Server Action, route handler REST y tool MCP de edición/publicación, verificar `if (resource.isArchived) return 403 / Error("El recurso está archivado")`.
- **Razón:** Impide mutaciones accidentales o intencionales sobre recursos congelados.

## Risks / Trade-offs

- [Preservación del registro User] → El registro de `User` permanece en la base como histórico/autor atribuido sin tokens activos ni sesión. Aceptado para cumplir con la integridad relacional de Prisma.

## Open Questions

- *Proceso de adopción futura*: El mecanismo para que otro usuario adopte una skill archivada se definirá en fases posteriores del producto.
