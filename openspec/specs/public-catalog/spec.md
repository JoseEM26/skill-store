# public-catalog Specification

## Purpose
Define el comportamiento observable de la interfaz web pública de solo lectura para listar, buscar, filtrar y consultar el detalle e historial de cambios (changelog) de skills y contextos públicos alojados en PostgreSQL.

## Requirements

### Requirement: Listado público de skills y contextos
El sistema SHALL mostrar la lista de skills activas (no archivadas) y contextos públicos (`isPublic = true` e `isArchived = false`) a cualquier usuario sin requerir inicio de sesión ni credenciales.

#### Scenario: Visualización del catálogo público
- **WHEN** un usuario no autenticado ingresa a la página principal del catálogo
- **THEN** el sistema renderiza las cards de skills públicas y contextos públicos leídos directamente desde PostgreSQL

#### Scenario: Ocultamiento estricto de ideas privadas y archivadas
- **WHEN** existen registros en `Context` con `isPublic = false` o registros con `isArchived = true`
- **THEN** el sistema los excluye totalmente del listado público y de los resultados de búsqueda

### Requirement: Búsqueda y filtrado basado en URL
El sistema SHALL permitir la búsqueda textual sobre nombre, descripción y tags, así como el filtrado por tipo de recurso (`skill`, `idea`, `external_reference`), manejando el estado mediante query parameters en la URL (`?q=...&type=...`) y ejecutando el renderizado en el servidor (React Server Components).

#### Scenario: Búsqueda con coincidencias
- **WHEN** el usuario realiza una búsqueda con un término presente en el nombre, descripción o tags de recursos públicos
- **THEN** el sistema muestra únicamente los recursos públicos que coinciden con el criterio

#### Scenario: Búsqueda sin resultados (Estado vacío explícito)
- **WHEN** el término de búsqueda no coincide con ningún recurso público registrado
- **THEN** el sistema presenta un componente de estado vacío explícito indicando "No se encontraron resultados", sin errores visuales ni página en blanco

### Requirement: Detalle de Skill y Changelog de versiones
El sistema SHALL proveer una ruta de detalle identificada por dueño y slug (`/skills/{owner}/{slug}`) que expone los metadatos completos de la skill, su versión más reciente, comando de instalación, contadores de descargas/instalaciones y el historial cronológico de versiones con sus respectivos changelogs.

#### Scenario: Consulta de skill existente
- **WHEN** se accede a la URL `/skills/{owner}/{slug}` de una skill registrada
- **THEN** el sistema presenta la información de la skill, la versión actual, el autor, el enlace al repositorio y la lista ordenada de versiones anteriores con sus textos de changelog

#### Scenario: Consulta de skill inexistente
- **WHEN** se solicita una URL de skill con combinación `{owner}/{slug}` que no existe en la base de datos
- **THEN** el sistema responde con una página 404 (Not Found) informativa

### Requirement: Detalle de Contexto público
El sistema SHALL proveer una vista de detalle para contextos públicos (`/contexts/{id}`) mostrando título, contenido textual, enlace externo (si aplica), tags y autor.

#### Scenario: Consulta de contexto público existente
- **WHEN** se accede al detalle de un contexto con `isPublic = true`
- **THEN** el sistema muestra los datos completos del contexto

#### Scenario: Intento de acceso a contexto privado
- **WHEN** un usuario no autenticado o no autorizado intenta acceder directamente al identificador de una idea privada (`isPublic = false`)
- **THEN** el sistema responde con 404 (Not Found), sin revelar la existencia ni el contenido del recurso

### Requirement: Exclusión de skills privadas/pausadas del catálogo público
El sistema SHALL excluir del catálogo público y de la página de detalle toda skill con
`isPublic: false` o `isPaused: true`, salvo que la vea su propio dueño autenticado desde el panel.

#### Scenario: Catálogo público sin sesión
- **WHEN** un visitante sin sesión navega el catálogo público
- **THEN** no ve ninguna skill privada ni pausada de ningún usuario

#### Scenario: Acceso directo a la URL de detalle de una skill privada o pausada
- **WHEN** alguien que no es el dueño intenta acceder directamente a la URL de detalle de una skill
  privada o pausada
- **THEN** el sistema responde 404, sin revelar que el recurso existe
