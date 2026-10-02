# Spec Delta

## ADDED Requirements

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
