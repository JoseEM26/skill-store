# Tasks

## 1. Esquemas Zod y capa de datos

- [x] 1.1 Crear esquemas Zod en `lib/validations/context.ts` y `lib/validations/skill.ts` para creación y actualización de ideas, referencias externas y skills, verificando con tests unitarios
- [x] 1.2 Implementar funciones de consulta y mutación en Prisma filtradas estrictamente por `{ ownerId }` y verificar con tests unitarios que aíslen recursos entre usuarios

## 2. Server Actions y autorización

- [x] 2.1 Implementar Server Actions para creación y edición de ideas (`type: 'idea'`) asignando `isPublic: false` por defecto y verificando la sesión activa
- [x] 2.2 Implementar Server Actions para creación y edición de referencias externas (`type: 'external_reference'`) forzando `isPublic: true` y validando el campo `link`
- [x] 2.3 Implementar Server Actions para registro de skills asignando `ownerId` y manejando errores de unicidad de slug por dueño
- [x] 2.4 Escribir tests automatizados para Server Actions verificando que un usuario autenticado A no pueda modificar ni borrar recursos del usuario B (rechazo 403)

## 3. Vistas de administración (UI)

- [x] 3.1 Construir la vista `/admin/contexts` (Server Component) listando ideas propias y referencias externas con badges de visibilidad (Privada / Pública)
- [x] 3.2 Construir componentes de formulario para creación y edición de ideas y referencias externas con feedback de validación
- [x] 3.3 Construir la vista `/admin/skills` con listado de skills propias y formulario de registro de nueva skill
- [x] 3.4 Escribir tests de componentes con React Testing Library para verificar el renderizado condicional de estados y formularios

## 4. Verificación integral

- [x] 4.1 Ejecutar la suite completa de pruebas (`pnpm test`) verificando que todas las validaciones, Server Actions y reglas de propiedad pasen satisfactoriamente
