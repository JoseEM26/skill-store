# Spec Delta

## ADDED Requirements

### Requirement: Resolución y direccionamiento unívoco por owner y slug
El sistema SHALL requerir y utilizar la combinación de nombre de usuario (`owner`) y `slug` de la skill para todas las operaciones de consulta, ruteo web (`/skills/{owner}/{slug}`) y endpoints REST (`/api/skills/{owner}/{slug}`).

#### Scenario: Consulta de skill calificada por owner y slug
- **WHEN** un cliente consulta una skill proveyendo `{owner}` y `{slug}`
- **THEN** el sistema retorna la skill correspondiente a ese dueño específico, sin ambigüedad frente a skills homónimas de otros usuarios

#### Scenario: Rechazo de colisión al publicar con mismo slug y mismo dueño
- **WHEN** un usuario intenta registrar una nueva skill cuyo `slug` ya existe bajo su propia autoría
- **THEN** el sistema rechaza la creación indicando conflicto por duplicidad

#### Scenario: Publicación exitosa de mismo slug por distintos dueños
- **WHEN** el usuario B publica una skill con el mismo `slug` que una skill existente del usuario A
- **THEN** el sistema almacena la nueva skill bajo el namespace del usuario B sin alterar la skill del usuario A
