# Spec Delta

## ADDED Requirements

### Requirement: Publicación de contenido completo vía MCP
El sistema SHALL permitir que `publish_skill` acepte un parámetro opcional `content` (markdown
completo con frontmatter); cuando se provee, SHALL validarlo contra la misma plantilla estricta
usada por el panel y la ingesta de GitHub Action (frontmatter completo + 6 secciones del body en
orden), guardando el resultado en `SkillVersion.files` y derivando los campos de `Skill` del
frontmatter. Cuando `content` se omite, `publish_skill` SHALL seguir funcionando igual que antes
(solo metadata, sin contenido).

#### Scenario: Publicar una skill con contenido completo válido vía MCP
- **WHEN** un token válido del dueño llama `publish_skill` con `content` cumpliendo la plantilla
  estricta
- **THEN** el sistema guarda el contenido en `SkillVersion.files` y los campos de `Skill` quedan
  derivados del frontmatter

#### Scenario: Publicar con contenido que no cumple la plantilla
- **WHEN** se llama `publish_skill` con `content` que no cumple el frontmatter o le faltan
  secciones obligatorias del body
- **THEN** la operación se rechaza con los errores de validación específicos, sin crear ni
  modificar ninguna `SkillVersion`

#### Scenario: Publicar sin content (compatibilidad hacia atrás)
- **WHEN** se llama `publish_skill` sin el parámetro `content`, igual que antes de este cambio
- **THEN** el sistema crea o actualiza la skill usando solo los campos de metadata, sin requerir ni
  validar contenido
