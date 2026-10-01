# Spec Delta

## ADDED Requirements

### Requirement: Archivado de recursos públicos y eliminación de recursos privados al dar de baja una cuenta
El sistema SHALL garantizar que al procesar la baja o revocación de una cuenta de usuario, todas sus skills y contextos públicos queden preservados con estado archivado (`isArchived = true`) para lectura e instalación sin admitir modificaciones, mientras que sus ideas privadas y tokens de acceso SHALL ser eliminados definitivamente.

#### Scenario: Preservación y archivado de recursos públicos
- **WHEN** un usuario con skills y/o contextos públicos tramita la eliminación de su cuenta
- **THEN** el sistema actualiza `isArchived = true` en sus skills y contextos públicos, manteniéndolos visibles e instalables en el catálogo

#### Scenario: Depuración definitiva de ideas privadas y tokens
- **WHEN** se elimina la cuenta de un usuario que posee ideas privadas y tokens de acceso
- **THEN** el sistema borra de forma irreversible todas sus ideas privadas (`type = 'idea'` con `isPublic = false`) y todos sus registros de `AccessToken`

#### Scenario: Bloqueo de mutaciones en recursos archivados
- **WHEN** se recibe una solicitud de edición o actualización de versión sobre una skill o contexto archivado
- **THEN** el sistema rechaza la operación indicando que el recurso se encuentra archivado y no admite cambios
