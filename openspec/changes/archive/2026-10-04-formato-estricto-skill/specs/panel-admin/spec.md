# Spec Delta

## ADDED Requirements

### Requirement: Carga manual de contenido completo de una skill
El sistema SHALL permitir a un usuario autenticado cargar o editar el contenido completo (markdown
con frontmatter) de una skill propia desde el panel, validándolo contra la misma plantilla
estricta usada por la ingesta de GitHub Action y por MCP (frontmatter completo + 6 secciones del
body en orden), guardando el resultado en `SkillVersion.files` y derivando los campos de `Skill`
(`name`, `description`, `license`) del frontmatter.

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
