# Spec Delta

## ADDED Requirements

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
