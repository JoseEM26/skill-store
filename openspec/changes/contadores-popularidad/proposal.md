# Proposal

## Why
El catálogo público y el servidor MCP necesitan registrar y mostrar señales objetivas de adopción de cada skill (`downloadsCount` e `installsCount`). Los usuarios que descargan una skill desde la web o la instalan vía MCP/CLI deben incrementar estos contadores automáticamente sin fricción de login, conforme a la decisión de arquitectura ADR-0009.

## What Changes
- Incremento atómico de `downloadsCount` al accionar el botón público "Descargar" en la interfaz web de una skill.
- Incremento atómico de `installsCount` al ejecutar el comando de instalación o invocar la acción de instalación vía MCP/CLI.
- Visualización de ambos contadores tanto en las cards de listado del catálogo como en la vista de detalle de cada skill.
- Establecimiento de la excepción de escritura pública sin autenticación para los contadores (ADR-0009), quedando protegidos exclusivamente por el rate limiting general por IP (ADR-0007).

## Capabilities

### New Capabilities
<!-- Ninguna capability nueva -->

### Modified Capabilities
- `data-model`: Se especifican los requisitos e invariantes de incremento público y atómico de `downloadsCount` e `installsCount` sobre las skills sin alterar el resto de sus propiedades ni requerir autenticación de dueño.

## Impact
- **API / Handlers**: Endpoints públicos REST (`POST /api/skills/{owner}/{slug}/download` e `install`) y Server Actions para disparar `increment: 1` en Prisma.
- **Servidor MCP**: Integración en las tools de descarga/instalación para reportar el incremento de `installsCount`.
- **UI Web**: Actualización de cards y vistas de detalle para renderizar los contadores actualizados.
- **Base de Datos / Modelo**: Uso de los campos preexistentes `downloadsCount` e `installsCount` en el modelo `Skill` bajo Postgres local.
