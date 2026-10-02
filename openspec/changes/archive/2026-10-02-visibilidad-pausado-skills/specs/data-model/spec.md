# Spec Delta

## ADDED Requirements

### Requirement: Visibilidad pública/privada de una skill
El sistema SHALL permitir que el dueño de una skill la marque como pública (`isPublic: true`,
default) o privada (`isPublic: false`). Una skill privada SHALL ser visible y gestionable
únicamente por su dueño.

#### Scenario: Skill recién publicada sin especificar visibilidad
- **WHEN** se publica una skill nueva sin indicar visibilidad
- **THEN** queda pública por defecto (`isPublic: true`), sin cambiar el comportamiento ya existente

#### Scenario: Dueño marca su skill como privada
- **WHEN** el dueño marca su skill como privada
- **THEN** la skill deja de ser visible para cualquier otro usuario o token que no sea del dueño

### Requirement: Pausado reversible de una skill
El sistema SHALL permitir que el dueño pause (`isPaused: true`) y reactive (`isPaused: false`) su
propia skill en cualquier momento, sin perder versiones ni contadores, de forma distinta e
independiente del archivado automático e irreversible por borrado de cuenta.

#### Scenario: Dueño pausa su skill
- **WHEN** el dueño pausa una skill propia
- **THEN** la skill queda oculta del catálogo activo y no instalable desde ahí, pero sigue
  existiendo con su historial de versiones y contadores intactos

#### Scenario: Dueño reactiva una skill pausada
- **WHEN** el dueño reactiva una skill que estaba pausada
- **THEN** la skill vuelve a aparecer en el catálogo activo exactamente con el estado que tenía
