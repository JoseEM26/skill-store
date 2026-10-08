# skill-groups Specification

## Purpose
Define cómo un usuario arma, gestiona y consulta grupos (colecciones nombradas) de sus propias
skills: creación y edición exclusivamente desde el panel web, lectura y descarga en lote vía
MCP/CLI.

## Requirements

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

### Requirement: Lectura de grupos vía MCP
El servidor MCP SHALL proveer las tools de solo lectura `list_groups` (grupos del dueño del token)
y `get_group` (nombre del grupo + lista de sus skills, cada una con su contenido completo),
aplicando los mismos filtros de propiedad/visibilidad que ya aplica `get_skill` sobre cada skill
individual del grupo.

#### Scenario: Listar los propios grupos
- **WHEN** se llama `list_groups` con un token válido
- **THEN** el sistema retorna los grupos del dueño del token, con su nombre y cantidad de skills

#### Scenario: Obtener un grupo con una skill que ya no es visible
- **WHEN** se llama `get_group` sobre un grupo que incluye una skill que el dueño pausó/privatizó
  y el token usado no pertenece a ese dueño
- **THEN** esa skill se omite de la respuesta, sin fallar la consulta del grupo completo

#### Scenario: Intento de leer un grupo ajeno
- **WHEN** se llama `get_group`/`list_groups` con un token que no pertenece al dueño del grupo
- **THEN** el sistema no retorna ese grupo
