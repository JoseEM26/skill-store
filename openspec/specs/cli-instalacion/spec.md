# cli-instalacion Specification

## Purpose
Define el contrato del CLI standalone que permite a un usuario, desde cualquier terminal y sin
depender de una IA, autenticarse, listar/buscar sus skills y las del catálogo público, y traer el
contenido de una skill elegida a un proyecto local — usable junto a cualquier agente (Claude Code,
Antigravity, OpenCode, etc.), no solo uno en particular.

## Requirements

### Requirement: Autenticación del CLI vía Personal Access Token
El CLI SHALL autenticarse reutilizando el sistema de Personal Access Tokens ya existente (emitidos
desde el panel admin), guardando el token localmente tras un `login` exitoso, y SHALL rechazar
cualquier comando que requiera autenticación si no hay un token guardado o si el token es
inválido/revocado.

#### Scenario: Login exitoso con token válido
- **WHEN** el usuario ejecuta `login` con un Personal Access Token válido
- **THEN** el CLI guarda el token localmente y los comandos subsiguientes lo usan automáticamente

#### Scenario: Comando que requiere sesión sin login previo
- **WHEN** el usuario ejecuta `whoami`, `list` en modo autenticado o `pull` sin haber hecho `login`
  antes
- **THEN** el CLI informa que no hay sesión activa, sin fallar con un error críptico

#### Scenario: Token guardado pero revocado
- **WHEN** el usuario ejecuta cualquier comando autenticado con un token previamente guardado que
  fue revocado desde el panel
- **THEN** el CLI informa que el token ya no es válido y pide volver a hacer `login`

### Requirement: Listado y búsqueda interactiva de skills
El CLI SHALL proveer comandos para listar y buscar skills (`list`, `search <query>`), mostrando
para cada resultado al menos `owner/slug`, nombre y descripción, y SHALL incluir las skills
privadas/pausadas propias del usuario autenticado junto a las públicas de terceros, sin mezclar
las privadas/pausadas ajenas.

#### Scenario: Listado sin autenticación
- **WHEN** el usuario ejecuta `list` sin haber hecho `login`
- **THEN** el CLI muestra únicamente las skills públicas y no pausadas del catálogo

#### Scenario: Listado autenticado incluye skills propias privadas/pausadas
- **WHEN** el usuario autenticado ejecuta `list`
- **THEN** el CLI muestra las skills públicas del catálogo junto con sus propias skills
  privadas/pausadas, sin incluir skills privadas/pausadas de otros usuarios

### Requirement: Traer una skill elegida al proyecto actual
El CLI SHALL proveer el comando `pull <owner>/<slug>`, que escribe el contenido completo de la
última versión de la skill elegida en un directorio del proyecto actual (por defecto
`.claude/skills/<slug>/`, configurable con `--dir`), y SHALL rechazar el pull de una skill
privada/pausada ajena exactamente igual que lo rechaza el servidor MCP subyacente.

#### Scenario: Pull de una skill pública
- **WHEN** el usuario ejecuta `pull owner/slug` para una skill pública y no pausada
- **THEN** el CLI escribe todos los archivos de su última versión en el directorio destino

#### Scenario: Pull de una skill propia privada o pausada
- **WHEN** el usuario autenticado ejecuta `pull` sobre una skill propia marcada como privada o
  pausada
- **THEN** el CLI la trae igual, porque el dueño siempre puede traer sus propias skills

#### Scenario: Pull de una skill privada o pausada ajena
- **WHEN** un usuario intenta `pull` sobre una skill privada o pausada que no le pertenece
- **THEN** el CLI rechaza la operación informando que la skill no existe o no está disponible, sin
  revelar que pertenece a otro usuario
