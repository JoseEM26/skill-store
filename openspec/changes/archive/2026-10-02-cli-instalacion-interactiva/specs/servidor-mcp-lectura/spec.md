# Spec Delta

## MODIFIED Requirements

### Requirement: Herramientas de consulta del catálogo de skills
El servidor MCP SHALL proveer las herramientas `list_skills`, `search_skills`, `get_skill`,
`get_version` y `check_updates` para la exploración pública del registro sin exigir autenticación
previa. `get_skill` y `get_version` SHALL incluir además el contenido completo de los archivos de
la skill (ruta relativa → contenido), sujeto a las mismas reglas de visibilidad que el resto de
estas herramientas.

#### Scenario: Listar skills públicas
- **WHEN** un cliente MCP invoca `list_skills`
- **THEN** el sistema retorna la lista de skills públicas no archivadas con metadata básica
  (`slug`, `name`, `description`, `owner`, `latestVersion`)

#### Scenario: Búsqueda de skills por término
- **WHEN** un cliente MCP invoca `search_skills` con un término de búsqueda
- **THEN** el sistema retorna las skills coincidentes en nombre, descripción o tags

#### Scenario: Consulta de versión específica y changelog
- **WHEN** un cliente MCP invoca `get_version` con el identificador de skill y versión semver
- **THEN** el sistema retorna el detalle de la versión, su changelog, el tag git asociado y el
  contenido completo de los archivos de esa versión

#### Scenario: Verificación de actualizaciones
- **WHEN** un cliente MCP invoca `check_updates` con el slug de una skill y la versión instalada
  actualmente
- **THEN** el sistema informa si existe una versión más reciente disponible o si está al día

#### Scenario: Obtener contenido completo de una skill pública
- **WHEN** un cliente MCP invoca `get_skill` para una skill pública y no pausada
- **THEN** la respuesta incluye el contenido completo de todos los archivos de su última versión

#### Scenario: Intento de obtener contenido de una skill privada o pausada ajena
- **WHEN** un cliente MCP invoca `get_skill`/`get_version` para una skill privada o pausada sin
  token o con un token que no es del dueño
- **THEN** el sistema no expone contenido alguno (mismo comportamiento de exclusión ya aplicado a
  su metadata)
