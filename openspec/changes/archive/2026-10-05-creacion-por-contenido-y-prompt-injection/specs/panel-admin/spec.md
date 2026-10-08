# Spec Delta

## MODIFIED Requirements

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
