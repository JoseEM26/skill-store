# Spec Delta

## MODIFIED Requirements

### Requirement: Gestión de grupos solo desde el panel web
El sistema SHALL permitir a un usuario autenticado crear, renombrar y borrar grupos propios,
exclusivamente desde el panel web — SHALL NOT exponer creación/edición de grupos como tool de
escritura en MCP. El sistema SHALL permitir agregar a un grupo propio cualquier skill que sea del
mismo dueño del grupo (incluida privada/pausada propia) **o** que sea pública y no pausada,
independientemente de quién la haya publicado.

#### Scenario: Creación de un grupo
- **WHEN** un usuario autenticado crea un grupo nuevo con un nombre desde el panel
- **THEN** el grupo queda registrado asociado a su `ownerId`, inicialmente vacío

#### Scenario: Agregar una skill pública de otro dueño a un grupo propio
- **WHEN** un usuario agrega a su grupo una skill pública y no pausada que pertenece a otro
  usuario
- **THEN** el sistema acepta la operación, quedando esa skill en el grupo

#### Scenario: Agregar una skill ajena a un grupo propio
- **WHEN** un usuario intenta agregar a su grupo una skill que no le pertenece y que es privada o
  está pausada
- **THEN** el sistema rechaza la operación