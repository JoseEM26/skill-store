# Spec Delta

## ADDED Requirements

### Requirement: Control de visibilidad y pausado desde el panel
El sistema SHALL permitir, desde el panel de administración, que el dueño alterne la visibilidad
(pública/privada) y el pausado de sus propias skills, y SHALL mostrar una advertencia previa al
confirmar el borrado definitivo cuyo texto depende de la visibilidad de la skill en ese momento.

#### Scenario: Alternar visibilidad desde el panel
- **WHEN** el dueño cambia la visibilidad de una skill propia desde "Mis Skills"
- **THEN** el cambio se refleja de inmediato en el catálogo público

#### Scenario: Advertencia de borrado de skill pública
- **WHEN** el dueño intenta borrar definitivamente una skill que es pública
- **THEN** el sistema muestra una advertencia explícita de que quienes ya la descargaron o
  instalaron conservan su copia local, antes de permitir confirmar el borrado

#### Scenario: Advertencia de borrado de skill privada
- **WHEN** el dueño intenta borrar definitivamente una skill que es privada
- **THEN** el sistema muestra una advertencia que aclara que no hay copias de terceros, sin mención
  a descargas/instalaciones de otros usuarios
