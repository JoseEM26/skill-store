# Spec Delta

## ADDED Requirements

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
