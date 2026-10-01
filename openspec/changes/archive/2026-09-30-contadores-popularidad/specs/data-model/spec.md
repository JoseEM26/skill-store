# Spec Delta

## ADDED Requirements

### Requirement: Incremento atómico y público de contadores de popularidad
El sistema SHALL permitir incrementar los contadores `downloadsCount` e `installsCount` de una skill de forma atómica y pública, sin requerir autenticación ni verificación de dueño (ADR-0009), manteniendo inmutables el resto de atributos de la entidad `Skill`.

#### Scenario: Descarga de skill desde la web
- **WHEN** un usuario (autenticado o anónimo) acciona la descarga de una skill existente
- **THEN** el sistema incrementa `downloadsCount` exactamente en 1 de forma atómica y refleja el nuevo total

#### Scenario: Instalación de skill vía MCP o CLI
- **WHEN** se ejecuta la acción de instalación de una skill existente vía MCP o CLI
- **THEN** el sistema incrementa `installsCount` exactamente en 1 de forma atómica y refleja el nuevo total

#### Scenario: Intento de incremento sobre recurso inexistente
- **WHEN** se solicita el incremento de descarga o instalación para una combinación `{owner}/{slug}` inexistente
- **THEN** el sistema retorna un error 404 sin modificar ningún contador
