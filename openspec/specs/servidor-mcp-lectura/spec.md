# servidor-mcp-lectura Specification

## Purpose
Provee un servidor Model Context Protocol (MCP) que expone herramientas para consultar el catálogo público de skills y contextos, así como la herramienta agregada `get_my_setup` para inicializar entornos de trabajo en una sola llamada autenticada.

## Requirements

### Requirement: Herramientas de consulta del catálogo de skills
El servidor MCP SHALL proveer las herramientas `list_skills`, `search_skills`, `get_skill`, `get_version` y `check_updates` para la exploración pública del registro sin exigir autenticación previa.

#### Scenario: Listar skills públicas
- **WHEN** un cliente MCP invoca `list_skills`
- **THEN** el sistema retorna la lista de skills públicas no archivadas con metadata básica (`slug`, `name`, `description`, `owner`, `latestVersion`)

#### Scenario: Búsqueda de skills por término
- **WHEN** un cliente MCP invoca `search_skills` con un término de búsqueda
- **THEN** el sistema retorna las skills coincidentes en nombre, descripción o tags

#### Scenario: Consulta de versión específica y changelog
- **WHEN** un cliente MCP invoca `get_version` con el identificador de skill y versión semver
- **THEN** el sistema retorna el detalle de la versión, su changelog y el tag git asociado

#### Scenario: Verificación de actualizaciones
- **WHEN** un cliente MCP invoca `check_updates` con el slug de una skill y la versión instalada actualmente
- **THEN** el sistema informa si existe una versión más reciente disponible o si está al día

### Requirement: Herramientas de consulta de contextos y visibilidad condicional
El servidor MCP SHALL proveer las herramientas `list_contexts` y `get_context`, exponiendo referencias externas a cualquier usuario, y revelando ideas privadas únicamente si se presenta un token de acceso válido con scope `read` perteneciente al dueño de dichas ideas.

#### Scenario: Listar contextos de forma anónima o sin token
- **WHEN** un cliente MCP invoca `list_contexts` sin token de autenticación
- **THEN** el sistema retorna únicamente las referencias externas y cualquier idea expresamente marcada como pública

#### Scenario: Listar contextos con token de acceso válido
- **WHEN** un cliente MCP invoca `list_contexts` proveyendo un token válido con scope `read`
- **THEN** el sistema retorna las referencias públicas y las ideas privadas pertenecientes al dueño del token

#### Scenario: Obtener detalle de idea privada sin autorización
- **WHEN** un cliente MCP invoca `get_context` para una idea privada sin proveer token o con un token de otro usuario
- **THEN** el sistema rechaza la consulta con error de recurso no encontrado o no autorizado (404/403) sin filtrar contenido

### Requirement: Herramienta consolidada de inicialización de setup
El servidor MCP SHALL proveer la herramienta `get_my_setup`, la cual exige obligatoriamente un token de acceso válido con scope `read` y devuelve en una única respuesta JSON todas las skills y contextos asociados al dueño del token.

#### Scenario: Ejecución exitosa de get_my_setup
- **WHEN** un cliente MCP invoca `get_my_setup` con un token válido con scope `read`
- **THEN** el sistema retorna un objeto con el conjunto de skills del usuario y sus contextos (ideas privadas + referencias) en una sola respuesta estructurada

#### Scenario: Intento de ejecución de get_my_setup sin token o con token inválido
- **WHEN** un cliente MCP invoca `get_my_setup` sin token, con token revocado o con scope insuficiente
- **THEN** el sistema rechaza la petición con error 401/403 sin retornar información de ningún recurso

### Requirement: Validación de esquemas de entrada de herramientas MCP
El servidor MCP SHALL validar los parámetros de entrada de todas sus herramientas utilizando esquemas Zod compartidos, rechazando argumentos inválidos antes de consultar la base de datos.

#### Scenario: Invocación con argumentos malformados
- **WHEN** un cliente MCP llama a una herramienta con parámetros de tipo incorrecto o campos requeridos faltantes
- **THEN** el sistema retorna un error descriptivo de validación sin propagar excepciones internas
