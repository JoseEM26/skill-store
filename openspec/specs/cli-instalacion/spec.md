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

### Requirement: Dashboard interactivo de pantalla completa (`tui`)
El CLI SHALL proveer el comando `tui`, que muestra un dashboard de pantalla completa con
navegación por teclado (flechas o `j`/`k`), filtro de texto en vivo sobre la lista de skills, y
permite traer (`pull`) la skill seleccionada al presionar Enter, saliendo con Esc o `q`. El
dashboard SHALL reflejar exactamente las mismas reglas de visibilidad/autenticación que `list` y
`search` (skills privadas/pausadas propias incluidas si hay sesión, ajenas nunca visibles). La
lista SHALL mostrarse como una ventana deslizante de 5 ítems visibles a la vez (sin importar
cuántos resultados haya en total), y SHALL permitir marcar varios ítems con la tecla Tab
para traerlos todos juntos al presionar Enter.

#### Scenario: Navegación y selección
- **WHEN** el usuario ejecuta `tui`, navega la lista con las flechas y presiona Enter sobre una
  skill sin haber marcado ninguna con Tab
- **THEN** el CLI trae (`pull`) esa skill al directorio destino, igual que lo haría el comando
  `pull` directo

#### Scenario: Filtro en vivo
- **WHEN** el usuario escribe texto mientras el dashboard está abierto
- **THEN** la lista se filtra en vivo a las skills cuyo nombre, slug o descripción coincide, sin
  necesidad de confirmar con Enter para filtrar

#### Scenario: Salida sin seleccionar
- **WHEN** el usuario presiona Esc o `q` sin haber seleccionado ninguna skill
- **THEN** el CLI cierra el dashboard sin traer ningún archivo

#### Scenario: Sesión autenticada muestra skills propias privadas/pausadas
- **WHEN** el usuario tiene una sesión activa (`login` previo) y ejecuta `tui`
- **THEN** el dashboard incluye sus propias skills privadas/pausadas junto a las públicas, sin
  mostrar privadas/pausadas de otros usuarios

#### Scenario: Ventana deslizante con más de 5 resultados
- **WHEN** la lista filtrada tiene más de 5 skills y el usuario navega con flecha abajo más allá
  del último ítem visible
- **THEN** la ventana visible se desplaza mostrando los siguientes ítems, manteniendo siempre como
  máximo 5 filas de skills en pantalla

#### Scenario: Selección múltiple y pull en lote
- **WHEN** el usuario marca varios ítems con la tecla Tab (en una o más posiciones de la
  ventana deslizante) y presiona Enter
- **THEN** el CLI trae (`pull`) todos los ítems marcados, uno por uno, informando el resultado de
  cada uno

### Requirement: Traer un grupo completo (`pull-group`)
El CLI SHALL proveer el comando `pull-group <nombre>`, que trae (`pull`) todas las skills de un
grupo propio de una sola invocación, reusando la lógica de `pull` existente para cada skill, y
SHALL informar el resultado individual de cada una (éxito o error) sin abortar el resto si una
falla.

#### Scenario: Pull de un grupo con varias skills
- **WHEN** el usuario ejecuta `pull-group mi-stack-react` sobre un grupo propio con 10 skills
- **THEN** el CLI trae las 10 skills a sus directorios destino, informando el resultado de cada
  una

#### Scenario: Pull de un grupo que no existe o no es propio
- **WHEN** el usuario ejecuta `pull-group` con un nombre de grupo que no existe o no le pertenece
- **THEN** el CLI informa que el grupo no existe o no está disponible, sin traer nada

### Requirement: Selección de un grupo guardado desde `tui`
El dashboard `tui` SHALL ofrecer una opción para elegir uno de los grupos guardados del usuario
autenticado y traerlo completo, equivalente a ejecutar `pull-group` sobre ese grupo.

#### Scenario: Elegir y traer un grupo desde el dashboard
- **WHEN** el usuario autenticado abre `tui`, elige la opción de grupos y selecciona uno de sus
  grupos guardados
- **THEN** el CLI trae todas las skills de ese grupo, igual que `pull-group`
