# panel-admin Specification

## Purpose
Define los requerimientos de interacción y operaciones de backend para la administración, creación, edición y visualización de recursos propios (ideas privadas, referencias externas y skills) por parte de usuarios autenticados.

## Requirements

### Requirement: Creación y edición de ideas privadas por defecto
El sistema SHALL permitir a un usuario autenticado crear y editar ideas (`type: 'idea'`), asignándolas como privadas (`isPublic: false`) por defecto, a menos que el usuario marque explícitamente la idea como pública.

#### Scenario: Creación de una idea sin especificar visibilidad pública
- **WHEN** un usuario autenticado envía el formulario de creación de una idea sin marcar la opción pública
- **THEN** el sistema guarda la idea asociada a su `ownerId` con `isPublic: false`

#### Scenario: Publicación voluntaria de una idea
- **WHEN** un usuario autenticado edita o crea una idea propia y marca la casilla de visibilidad pública
- **THEN** el sistema actualiza el registro con `isPublic: true`

### Requirement: Creación y edición de referencias externas de contexto públicas
El sistema SHALL permitir a un usuario autenticado crear y editar referencias a herramientas o repositorios externos (`type: 'external_reference'`), exigiendo título, descripción, enlace (`link`) y forzando `isPublic: true`.

#### Scenario: Creación de referencia externa válida
- **WHEN** un usuario autenticado envía el formulario de nueva referencia externa con título, descripción y link
- **THEN** el sistema guarda el contexto con `type: 'external_reference'`, `isPublic: true` y asociado a su `ownerId`

#### Scenario: Intento de crear referencia externa sin enlace
- **WHEN** un usuario intenta crear un contexto de tipo `external_reference` sin proveer un link válido
- **THEN** el sistema rechaza la operación informando el error de validación

### Requirement: Registro y gestión de skills propias
El sistema SHALL permitir a un usuario autenticado registrar y administrar skills asociadas a su cuenta, validando que el `slug` sea único para dicho usuario y asignando su `ownerId`.

#### Scenario: Registro exitoso de una skill propia
- **WHEN** un usuario autenticado registra una nueva skill con nombre, slug, descripción y repositorio
- **THEN** el sistema guarda la skill con el `ownerId` del usuario autenticado y contadores en cero

#### Scenario: Conflicto de slug para el mismo dueño
- **WHEN** un usuario intenta registrar una skill con un `slug` que ya tiene registrado en su cuenta
- **THEN** el sistema rechaza la operación por colisión de slug propio

### Requirement: Aislamiento estricto de recursos por dueño
El sistema SHALL restringir las operaciones de modificación y eliminación en el panel administrativo exclusivamente al usuario propietario (`ownerId === session.userId`).

#### Scenario: Intento de edición de recurso ajeno
- **WHEN** un usuario autenticado A intenta ejecutar una mutación de edición o borrado sobre una idea, contexto o skill perteneciente al usuario B
- **THEN** el sistema deniega la operación con un error de autorización (403 o mensaje equivalente) sin aplicar modificaciones

### Requirement: Visualización y filtrado de recursos propios en el panel
El sistema SHALL mostrar en el panel administrativo únicamente los recursos gestionados por el usuario autenticado, indicando claramente la atribución de autoría y el estado de visibilidad.

#### Scenario: Listado de contextos en el panel
- **WHEN** un usuario autenticado accede a `/admin/contexts`
- **THEN** el sistema lista todas sus ideas (privadas y públicas) y sus referencias externas, ocultando las ideas privadas de otros usuarios

### Requirement: Control de visibilidad y pausado desde el panel
El sistema SHALL permitir, desde el panel de administración, que el dueño alterne la visibilidad
(pública/privada) y el pausado de sus propias skills, y SHALL mostrar una advertencia previa al
confirmar el borrado definitivo cuyo texto depende de la visibilidad de la skill en ese momento.

#### Scenario: Alternar visibilidad desde el panel
- **WHEN** el dueño cambia la visibilidad de una skill propia desde "Mis Skills"
- **THEN** el cambio se refleja de inmediato en el catálogo público

#### Scenario: Advertencia de borrado de skill pública
- **WHEN** el dueño intenta borrar definitivamente una skill que es pública
- **THEN** el sistema muestra una advertencia explícita de que quienes ya la descargaron o
  instalaron conservan su copia local, antes de permitir confirmar el borrado

#### Scenario: Advertencia de borrado de skill privada
- **WHEN** el dueño intenta borrar definitivamente una skill que es privada
- **THEN** el sistema muestra una advertencia que aclara que no hay copias de terceros, sin mención
  a descargas/instalaciones de otros usuarios

### Requirement: Carga manual de contenido completo de una skill
El sistema SHALL permitir a un usuario autenticado crear una skill nueva o editar una propia
existente cargando el contenido completo (markdown con frontmatter) desde el panel, como forma
principal del flujo de creación (no solo de edición), validándolo contra la misma plantilla
estricta usada por la ingesta de GitHub Action y por MCP (frontmatter completo + 6 secciones del
body en orden, más el filtro de prompt injection), guardando el resultado en `SkillVersion.files`
y derivando los campos de `Skill` (`name`, `slug`, `description`, `license`) del frontmatter.
`repositoryUrl` SHALL seguir siendo un campo opcional, nunca bloqueante para crear o editar una
skill por contenido.

#### Scenario: Carga de contenido válido
- **WHEN** un usuario autenticado pega o escribe en el panel un markdown completo que cumple la
  plantilla estricta
- **THEN** el sistema guarda el contenido en `SkillVersion.files` y actualiza los campos de `Skill`
  derivados del frontmatter

#### Scenario: Carga de contenido que no cumple la plantilla
- **WHEN** un usuario autenticado intenta guardar contenido que no cumple el frontmatter o le
  faltan secciones obligatorias del body
- **THEN** el sistema rechaza la operación mostrando los errores de validación específicos, sin
  guardar nada

#### Scenario: Edición de contenido de una skill ajena
- **WHEN** un usuario intenta cargar contenido para una skill que no le pertenece
- **THEN** el sistema rechaza la operación, igual que cualquier otra mutación sobre un recurso
  ajeno

#### Scenario: Creación de una skill nueva pegando el contenido completo
- **WHEN** un usuario autenticado pega un markdown completo válido sin haber creado antes una
  skill con ese `name`/`slug`
- **THEN** el sistema crea la `Skill` y su primera `SkillVersion` en un solo paso, sin exigir
  `repositoryUrl` ni ningún otro campo de metadata suelta previamente

#### Scenario: Creación con un nombre ya usado por el mismo dueño
- **WHEN** un usuario autenticado pega un contenido cuyo `name` de frontmatter coincide con una
  skill que ya tiene registrada
- **THEN** el sistema rechaza la operación informando el conflicto de nombre, sin crear nada
