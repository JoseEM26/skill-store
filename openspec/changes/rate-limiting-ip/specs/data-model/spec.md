# Spec Delta

## ADDED Requirements

### Requirement: Registro de solicitudes y restricción por rate limiting en Postgres
El sistema SHALL registrar los eventos de acceso a endpoints públicos por IP y ruta con marca de tiempo en Postgres, rechazando con código HTTP 429 Too Many Requests toda solicitud que exceda el umbral configurado dentro de la ventana deslizante activa (ADR-0007).

#### Scenario: Petición dentro del límite permitido
- **WHEN** una IP realiza una solicitud a un endpoint público y su conteo en la ventana deslizante no supera el umbral
- **THEN** el sistema registra el evento y procesa la petición normalmente

#### Scenario: Petición que excede el umbral
- **WHEN** una IP realiza una solicitud superando la cantidad de requests permitidos dentro de la ventana activa
- **THEN** el sistema responde con código HTTP 429 Too Many Requests y bloquea el procesamiento

### Requirement: Purga periódica de registros de rate limit obsoletos
El sistema SHALL eliminar periódicamente de la base de datos los registros de rate limit con antigüedad mayor a la ventana temporal activa para evitar el crecimiento ilimitado de la tabla.

#### Scenario: Limpieza de registros antiguos
- **WHEN** se ejecuta el proceso de depuración periódica de rate limit
- **THEN** los registros anteriores al límite de la ventana activa son borrados físicamente de Postgres
