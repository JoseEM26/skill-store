# Proposal

## Why
Cuando un usuario decide eliminar su cuenta o revocar su autorización OAuth, la eliminación en cascada ciega rompería las dependencias de otros desarrolladores que utilizan sus skills públicas y referencias compartidas. Es necesario garantizar un ciclo de vida donde los recursos públicos se archiven (permaneciendo legibles e instalables pero inmutables) y los recursos privados (ideas no públicas y tokens) se eliminen de manera permanente.

## What Changes
- Implementación de la lógica de baja y borrado de cuenta de usuario.
- Archivado automático (`isArchived = true`) de todas las skills y contextos públicos (`isPublic = true` o `external_reference`) pertenecientes al usuario dado de baja.
- Eliminación física irreversible de todas las ideas privadas (`type = 'idea'` con `isPublic = false`) y de los tokens de acceso (`AccessToken`) del usuario.
- Bloqueo de operaciones de edición/actualización sobre recursos archivados tanto en el panel como en la API y el servidor MCP.

## Capabilities

### New Capabilities
<!-- Ninguna capability nueva -->

### Modified Capabilities
- `data-model`: Define los requisitos de archivado de recursos públicos (skills y contextos públicos) y de eliminación de recursos privados (ideas privadas y tokens) ante la baja o revocación de un usuario.

## Impact
- **Lógica de Servicio / Auth**: Servicio de eliminación de cuenta (`deleteAccount`) que orquesta la transacción de archivado y depuración en Prisma.
- **Catálogo / MCP**: Presentación visual de skills y contextos archivados como recursos históricos de solo lectura ("archivado / sin dueño activo"), permitiendo descarga e instalación pero impidiendo modificaciones.
- **Seguridad**: Invalidación total e inmediata de tokens de acceso y sesiones activas del usuario eliminado.
