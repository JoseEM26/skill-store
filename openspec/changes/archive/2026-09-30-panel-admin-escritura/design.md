# Design

## Context

Con la autenticación basada en GitHub OAuth implementada (ítem #6), el sistema dispone de la sesión del usuario (`session.userId`). La arquitectura definida en ADR-0005 establece el uso de Server Actions para formularios de escritura y Server Components para lectura, sin estados globales en el cliente, persistiendo en PostgreSQL local vía Prisma.

## Goals / Non-Goals

**Goals:**
- Implementar vistas de gestión administrativa en `/admin/contexts` y `/admin/skills`.
- Proveer Server Actions para crear y editar ideas (`type: 'idea'`) y referencias externas (`type: 'external_reference'`).
- Proveer Server Actions para registrar y actualizar metadata de skills propias (`ownerId = session.userId`).
- Validar rigurosamente los esquemas de entrada mediante Zod y garantizar invariantes de visibilidad (`isPublic: false` por defecto para ideas, `isPublic: true` forzado para referencias externas).
- Asegurar autorización estricta: ninguna acción puede modificar o eliminar un recurso si `ownerId` no coincide con el usuario autenticado.

**Non-Goals:**
- Emisión o revocación de tokens de acceso MCP (corresponde a #8).
- Endpoints REST o tools MCP de escritura (corresponde a #10).
- Colaboración o coedición multiusuario sobre un mismo recurso.

## Decisions

### 1. Server Actions para mutaciones de UI
- **Decisión**: Utilizar Server Actions de Next.js App Router para todas las operaciones de escritura del panel administrativo, acompañadas de `revalidatePath`.
- **Razón**: Alineado con ADR-0005. Simplifica la protección CSRF integrada y el re-renderizado automático en el servidor sin clientes de estado pesado.
- **Alternativa descartada**: Endpoints API REST consumidos con `fetch` desde el cliente del panel, descartado para evitar duplicación de capa de transporte interna.

### 2. Esquemas Zod compartidos para validación de entrada
- **Decisión**: Definir schemas Zod (`createIdeaSchema`, `updateIdeaSchema`, `createExternalReferenceSchema`, `createSkillSchema`) en una capa compartida (`lib/validations/*`).
- **Razón**: Garantiza validación idéntica en Server Actions y futuras rutas de API o herramientas MCP (ADR-0004).

### 3. Autorización atómica a nivel de consulta Prisma
- **Decisión**: Las mutaciones de actualización y borrado filtrarán directamente por `{ id, ownerId: session.userId }` en Prisma. Si el registro no se actualiza o no se encuentra, se lanza una excepción de autorización denegada (403).
- **Razón**: Previene vulnerabilidades de tipo IDOR (Insecure Direct Object Reference) y elimina condiciones de carrera entre verificación y escritura.

### 4. Manejo de colisión de slugs
- **Decisión**: Para skills, capturar la violación de restricción única (`P2002` en Prisma para `[ownerId, slug]`) y transformarla en un error de campo amigable para el usuario ("Ya tienes una skill registrada con este slug").

## Risks / Trade-offs

- **[Intento de forzar `isPublic: false` en referencias externas]** → Mitigación: El schema Zod fuerza `isPublic: true` y la base de datos cuenta con la restricción `CHECK` de integridad (ADR-0003).
- **[Edición concurrente sobre un recurso]** → Mitigación: El modelo de un solo dueño hace despreciable el riesgo de colisiones concurrentes legítimas en el MVP.
