# Proposal

## Why

Una vez que el usuario puede autenticarse mediante GitHub OAuth (ítem #6), necesita una interfaz y operaciones de backend para administrar su propio contenido en el registro. Este cambio habilita la gestión de escritura de ideas personales (privadas por defecto), referencias externas de contexto y skills propias desde el panel administrativo, garantizando la atribución de dueño y la restricción estricta de que ningún usuario pueda modificar recursos de otro.

## What Changes

- Vistas y formularios en el panel administrativo (`/admin/contexts`, `/admin/skills`) para creación y edición de recursos.
- Operaciones de Server Actions con validación Zod para:
  - Creación y edición de ideas (`type: 'idea'`), con visibilidad privada (`isPublic: false`) por defecto y opción de marcarlas públicas.
  - Creación y edición de referencias externas (`type: 'external_reference'`), forzando `isPublic: true` según reglas de integridad.
  - Registro y publicación de skills propias (`ownerId = session.userId`) asociando repositorio, descripción, licencia y slug.
- Autorización estricta por dueño: cada mutación valida que el recurso pertenezca al usuario de la sesión activa (`ownerId === session.userId`), rechazando intentos de modificación de recursos ajenos.
- Atribución visible del dueño en las listas y formularios del panel.

## Capabilities

### New Capabilities
- `panel-admin`: Interfaz y operaciones de escritura para que los usuarios autenticados creen, editen y gestionen sus propias ideas (privadas por defecto), referencias de contexto externas y skills propias con verificación estricta de propiedad.

### Modified Capabilities
<!-- No se modifican los requerimientos del modelo de datos base ya existente en data-model. -->

## Impact

- **UI / Frontend**: Nuevas páginas bajo `/admin` (listados propios, formularios de creación/edición de contextos y skills) usando Server Components y Tailwind CSS.
- **Backend**: Server Actions para mutaciones sobre `Context` y `Skill` en Prisma con validación Zod y verificación de sesión.
- **Seguridad**: Control de acceso a nivel de recurso (solo el dueño puede mutar su contenido).
