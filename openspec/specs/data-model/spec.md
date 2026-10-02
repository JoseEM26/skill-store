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

### Requirement: Incremento atómico y público de contadores de popularidad
El sistema SHALL permitir incrementar los contadores `downloadsCount` e `installsCount` de una skill de forma atómica y pública, sin requerir autenticación ni verificación de dueño (ADR-0009), manteniendo inmutables el resto de atributos de la entidad `Skill`.

#### Scenario: Descarga de skill desde la web
- **WHEN** un usuario (autenticado o anónimo) acciona la descarga de una skill existente
- **THEN** el sistema incrementa `downloadsCount` exactamente en 1 de forma atómica y refleja el nuevo total

#### Scenario: Instalación de skill vía MCP o CLI
- **WHEN** se ejecuta la acción de instalación de una skill existente vía MCP o CLI
- **THEN** el sistema incrementa `installsCount` exactamente en 1 de forma atómica y refleja el nuevo total

#### Scenario: Intento de incremento sobre recurso inexistente
- **WHEN** se solicita el incremento de descarga o instalación para una combinación `{owner}/{slug}` inexistente
- **THEN** el sistema retorna un error 404 sin modificar ningún contador

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

### Requirement: Registro de solicitudes y restricción por rate limiting en Postgres
El sistema SHALL registrar los eventos de acceso a endpoints públicos por IP y ruta con marca de tiempo en Postgres, rechazando con código HTTP 429 Too Many Requests toda solicitud que exceda el umbral configurado dentro de la ventana deslizante activa (ADR-0007).

#### Scenario: Petición dentro del límite permitido
- **WHEN** una IP realiza una solicitud a un endpoint público y su conteo en la ventana deslizante no supera el umbral
- **THEN** el sistema registra el evento y procesa la petición normalmente

#### Scenario: Petición que excede el umbral
- **WHEN** una IP realiza una solicitud superando la cantidad de requests permitidos dentro de la ventana activa
- **THEN** el sistema responde con código HTTP 429 Too Many Requests y bloquea el procesamiento

### Requirement: Purga periódica de registros de rate limit obsoletos
El sistema SHALL eliminar periódicamente de la base de datos los registros de rate limit con antigüedad mayor a la ventana temporal activa para evitar el crecimiento ilimitado de la tabla.

#### Scenario: Limpieza de registros antiguos
- **WHEN** se ejecuta el proceso de depuración periódica de rate limit
- **THEN** los registros anteriores al límite de la ventana activa son borrados físicamente de Postgres

### Requirement: Visibilidad pública/privada de una skill
El sistema SHALL permitir que el dueño de una skill la marque como pública (`isPublic: true`,
default) o privada (`isPublic: false`). Una skill privada SHALL ser visible y gestionable
únicamente por su dueño.

#### Scenario: Skill recién publicada sin especificar visibilidad
- **WHEN** se publica una skill nueva sin indicar visibilidad
- **THEN** queda pública por defecto (`isPublic: true`), sin cambiar el comportamiento ya existente

#### Scenario: Dueño marca su skill como privada
- **WHEN** el dueño marca su skill como privada
- **THEN** la skill deja de ser visible para cualquier otro usuario o token que no sea del dueño

### Requirement: Pausado reversible de una skill
El sistema SHALL permitir que el dueño pause (`isPaused: true`) y reactive (`isPaused: false`) su
propia skill en cualquier momento, sin perder versiones ni contadores, de forma distinta e
independiente del archivado automático e irreversible por borrado de cuenta.

#### Scenario: Dueño pausa su skill
- **WHEN** el dueño pausa una skill propia
- **THEN** la skill queda oculta del catálogo activo y no instalable desde ahí, pero sigue
  existiendo con su historial de versiones y contadores intactos

#### Scenario: Dueño reactiva una skill pausada
- **WHEN** el dueño reactiva una skill que estaba pausada
- **THEN** la skill vuelve a aparecer en el catálogo activo exactamente con el estado que tenía

### Requirement: Contenido completo de cada versión de skill
El sistema SHALL almacenar el contenido completo de cada archivo de una skill (ruta relativa →
contenido) junto a su `SkillVersion`, de forma que una versión publicada sea recuperable sin
depender de que el repositorio de origen siga disponible.

#### Scenario: Skill con un solo archivo
- **WHEN** se publica una versión de una skill cuyo único archivo es `SKILL.md`
- **THEN** el contenido completo de `SKILL.md` queda guardado junto a esa `SkillVersion`

#### Scenario: Skill con archivos adicionales
- **WHEN** se publica una versión de una skill que incluye archivos adicionales además de
  `SKILL.md` (por ejemplo una plantilla)
- **THEN** el contenido de cada archivo adicional también queda guardado, asociado a su ruta
  relativa dentro del directorio de la skill
