# Design

## Context
Ver `proposal.md` y `specs/data-model/spec.md`. El modelo `Skill` posee la restricción `@@unique([ownerId, slug])` en Prisma y ADR-0004 estipula que las rutas REST deben incluir siempre `{owner}/{slug}` para resolver la skill sin ambigüedad.

## Goals / Non-Goals

**Goals:**
- Estructurar todos los route handlers de API y páginas web bajo `/api/skills/[owner]/[slug]` y `/skills/[owner]/[slug]`.
- Resolver skills mediante el `username` del usuario dueño y el `slug` del recurso.
- Retornar respuestas claras de conflicto (409 Conflict) cuando un mismo dueño intente duplicar un slug en una nueva publicación.

**Non-Goals:**
- No implementar soporte para alias globales sin dueño ni redirecciones cortas en este MVP.
- No alterar el schema de Prisma (la restricción de unicidad compuesta ya existe en la base de datos local).

## Decisions

### 1. Resolución vía join de User (`username`) y Skill (`slug`)
- **Decisión:** Al recibir `{owner, slug}` en la URL, buscar la skill usando `prisma.skill.findFirst({ where: { slug, owner: { username: owner } }, include: { versions: true, owner: true } })`.
- **Razón:** Las URLs usan el `username` amigable de GitHub en lugar del `id` interno (cuid), manteniendo URLs legibles (`/skills/alice/my-tool`).
- **Alternativas consideradas:**
  - *Usar `ownerId` en la URL (`/skills/cl.../my-tool`)*: Feo y difícil de memorizar para usuarios y herramientas CLI.

### 2. Manejo de colisiones en publicación
- **Decisión:** Capturar errores de unicidad de Prisma (`PrismaClientKnownRequestError` código `P2002`) al intentar crear una skill y transformarlos en un error HTTP `409 Conflict` con mensaje explícito indicando que el slug ya está en uso por ese dueño.
- **Razón:** Proporciona retroalimentación comprensible al usuario o al pipeline de CI/CD.

## Risks / Trade-offs

- [Cambio de username en GitHub] → Si un usuario cambia su username en GitHub, el ruteo de sus skills cambiaría si no se sincroniza; para el MVP el username se fija en el registro de sesión y se asume estable.

## Open Questions

- *Skills del sistema o globales*: Si en el futuro se requieren skills sin dueño u oficiales, se evaluará un namespace reservado (ej. `official/` o `system/`).
