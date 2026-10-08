# servidor-mcp-escritura Specification

## Purpose
Define las herramientas de creación, edición y eliminación de contextos y skills en el servidor MCP, aplicando la regla transversal de tres condiciones (token válido, scope apropiado y propiedad del recurso).

## Requirements

### Requirement: Creación y edición de contextos vía MCP con scope write
El servidor MCP SHALL proveer las herramientas `create_context` y `update_context`, exigiendo un token de acceso válido con scope `write`, asignando el recurso al dueño del token y respetando la visibilidad por defecto (`isPublic: false` para ideas, `isPublic: true` para referencias externas).

#### Scenario: Crear una idea privada vía MCP
- **WHEN** un cliente MCP invoca `create_context` con `type: "idea"`, `title`, `body` y un token con scope `write`
- **THEN** el sistema persiste la idea asignando `ownerId = token.ownerId`, `isPublic = false` y retorna el ID del nuevo contexto

#### Scenario: Actualizar un contexto propio vía MCP
- **WHEN** un cliente MCP invoca `update_context` con el ID de un contexto perteneciente al dueño del token y datos a modificar
- **THEN** el sistema aplica las modificaciones y confirma la actualización

### Requirement: Eliminación de contextos vía MCP con scope delete
El servidor MCP SHALL proveer la herramienta `delete_context`, exigiendo un token de acceso válido con scope `delete` y verificando que el recurso pertenezca al dueño del token.

#### Scenario: Eliminación exitosa de contexto propio
- **WHEN** un cliente MCP invoca `delete_context` con el ID de un contexto propio y un token con scope `delete`
- **THEN** el sistema elimina o archiva el contexto y retorna confirmación

#### Scenario: Intento de borrado con token sin scope delete
- **WHEN** un cliente MCP invoca `delete_context` con un token que solo tiene scopes `["read", "write"]`
- **THEN** el sistema rechaza la operación con error de autorización (403) sin modificar el registro

### Requirement: Publicación y actualización de skills vía MCP con scope write
El servidor MCP SHALL proveer la herramienta `publish_skill`, exigiendo un token de acceso válido con scope `write` y validando la unicidad del `slug` dentro del conjunto de skills del dueño del token.

#### Scenario: Publicar una skill nueva
- **WHEN** un cliente MCP invoca `publish_skill` con `slug`, `name`, `description`, `repositoryUrl` y un token con scope `write`
- **THEN** el sistema registra la skill asignando `ownerId = token.ownerId` con contadores en cero

#### Scenario: Intento de publicar skill con slug duplicado propio
- **WHEN** un cliente MCP invoca `publish_skill` usando un `slug` que ya pertenece a otra skill del mismo dueño
- **THEN** el sistema rechaza la llamada indicando la colisión de slug

### Requirement: Eliminación de skills vía MCP con scope delete
El servidor MCP SHALL proveer la herramienta `delete_skill`, exigiendo un token de acceso válido con scope `delete` y validando que la skill pertenezca al dueño del token.

#### Scenario: Eliminación exitosa de skill propia
- **WHEN** un cliente MCP invoca `delete_skill` con el slug/id de una skill propia y un token con scope `delete`
- **THEN** el sistema archiva o elimina la skill

### Requirement: Regla transversal de tres condiciones y aislamiento por dueño
El sistema SHALL denegar cualquier operación de escritura o borrado vía MCP si no se satisfacen simultáneamente las tres condiciones: (1) token activo y no revocado/expirado, (2) presencia del scope requerido (`write` o `delete`), y (3) coincidencia estricta de propiedad (`resource.ownerId === token.ownerId`).

#### Scenario: Intento de modificar recurso de otro usuario
- **WHEN** un cliente MCP presenta un token del usuario A con scope `write` e intenta invocar `update_context` sobre un recurso del usuario B
- **THEN** el sistema rechaza la operación con error 403 sin revelar datos del recurso ajeno

### Requirement: Control de visibilidad y pausado vía MCP
El sistema SHALL permitir que las tools `publish_skill` y `update_skill` acepten y apliquen los
campos de visibilidad (`isPublic`) y pausado (`isPaused`) de una skill, con la misma verificación
de propiedad (`ownerId === token.ownerId`) ya exigida para el resto de las mutaciones, sin que este
camino sea más ni menos permisivo que el panel web.

#### Scenario: Publicar o actualizar skill marcándola privada vía MCP
- **WHEN** se llama `publish_skill` o `update_skill` con un token válido del dueño indicando
  `isPublic: false`
- **THEN** la skill queda privada, visible solo para su dueño, igual que si se hiciera desde el
  panel

#### Scenario: Intento de cambiar visibilidad de una skill ajena
- **WHEN** se intenta cambiar `isPublic`/`isPaused` de una skill cuyo dueño no coincide con el del
  token
- **THEN** la operación se rechaza, igual que cualquier otra mutación sobre un recurso ajeno

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
