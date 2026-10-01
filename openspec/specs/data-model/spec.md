# data-model Specification

## Purpose
Define las entidades, relaciones e invariantes de integridad que la base de datos del registro
garantiza para usuarios, skills, versiones, contextos y tokens de acceso.

## Requirements

### Requirement: Unicidad de slug de skill por dueño
El sistema SHALL garantizar que el `slug` de una skill sea único dentro del alcance de su dueño,
permitiendo que dos dueños distintos usen el mismo `slug` sin colisión.

#### Scenario: Mismo slug, dueños distintos
- **WHEN** el usuario A y el usuario B publican cada uno una skill con `slug` `mi-skill`
- **THEN** ambas skills se guardan sin error, distinguibles por su dueño

#### Scenario: Mismo slug, mismo dueño
- **WHEN** el usuario A intenta publicar una segunda skill con el mismo `slug` que ya usa una
  skill propia existente
- **THEN** el sistema rechaza la operación por violar la unicidad

### Requirement: Visibilidad por defecto de un contexto según su tipo
El sistema SHALL exponer un contexto de tipo `idea` como privado por defecto, y SHALL garantizar
que un contexto de tipo `external_reference` sea siempre público, sin excepción.

#### Scenario: Idea nueva sin marcar visibilidad
- **WHEN** se crea un contexto de tipo `idea` sin especificar visibilidad
- **THEN** el contexto queda privado (visible solo para su dueño)

#### Scenario: Referencia externa nueva
- **WHEN** se crea un contexto de tipo `external_reference`
- **THEN** el contexto queda público, y ningún estado del sistema permite guardarlo como privado

### Requirement: Los tokens de acceso nunca se guardan en texto plano
El sistema SHALL almacenar únicamente un hash del token de acceso; el valor real SHALL mostrarse
al dueño una única vez, en el momento de creación.

#### Scenario: Consulta posterior a la creación
- **WHEN** el dueño u otro proceso consulta un token ya creado
- **THEN** el sistema no expone el valor real del token, solo su hash y metadata (scopes, dueño,
  expiración, último uso, estado de revocación)

### Requirement: Todo recurso publicado tiene un dueño
El sistema SHALL asociar cada skill, cada contexto y cada token de acceso a exactamente un
usuario dueño; ningún recurso de estos tipos SHALL existir sin dueño asignado.

#### Scenario: Intento de crear un recurso sin dueño
- **WHEN** se intenta registrar una skill, un contexto o un token sin un usuario dueño válido
- **THEN** el sistema rechaza la operación

### Requirement: Historial de versiones de una skill
El sistema SHALL registrar cada versión publicada de una skill de forma independiente y
ordenable, conservando su changelog y fecha de publicación, sin sobrescribir versiones previas.

#### Scenario: Publicación de una nueva versión
- **WHEN** se publica la versión `1.1.0` de una skill que ya tenía la versión `1.0.0` registrada
- **THEN** ambas versiones quedan consultables de forma independiente, con su propio changelog y
  fecha de publicación
