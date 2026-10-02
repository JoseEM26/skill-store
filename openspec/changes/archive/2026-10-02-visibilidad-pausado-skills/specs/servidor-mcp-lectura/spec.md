# Spec Delta

## ADDED Requirements

### Requirement: Exclusión de skills privadas/pausadas en tools de lectura
El sistema SHALL excluir de `list_skills`, `search_skills` y `get_skill` toda skill con
`isPublic: false` o `isPaused: true`, salvo que la llamada incluya un token válido perteneciente al
dueño de esa skill.

#### Scenario: Listado público sin token
- **WHEN** se llama `list_skills` sin token o con un token que no es del dueño
- **THEN** las skills privadas o pausadas de otros usuarios no aparecen en el resultado

#### Scenario: Dueño consulta sus propias skills privadas/pausadas con su token
- **WHEN** el dueño llama `list_skills`/`get_skill` con su propio token válido
- **THEN** sus skills privadas y/o pausadas sí aparecen en el resultado
