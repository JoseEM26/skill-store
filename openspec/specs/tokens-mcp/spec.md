# tokens-mcp Specification

## Purpose
Provee emisión, visualización en texto plano de única vez, almacenamiento criptográfico mediante hash SHA-256, revocación inmediata y verificación de tokens de acceso con scopes granulares (read, write, delete) para consumo del MCP y APIs autorizadas.

## Requirements

### Requirement: Emisión de token con scopes granulares y visualización única
El sistema SHALL permitir al usuario autenticado generar nuevos tokens de acceso especificando una etiqueta (`label`), una lista de scopes (`read`, `write`, `delete`) y opcionalmente una fecha de expiración (`expiresAt`), mostrando el token generado en texto plano exactamente una vez.

#### Scenario: Creación exitosa de token con scopes específicos
- **WHEN** un usuario autenticado genera un token con etiqueta "Claude Code Trabajo" y scopes `["read", "write"]`
- **THEN** el sistema retorna el token en texto plano para que el usuario lo copie y almacena únicamente el hash en la base de datos

#### Scenario: Visualización posterior de token creado
- **WHEN** un usuario recarga la página o consulta la lista de tokens previamente creados
- **THEN** el sistema expone únicamente la etiqueta, scopes, prefijo o metadata, sin mostrar jamás el valor completo en texto plano

### Requirement: Almacenamiento seguro mediante hash SHA-256
El sistema SHALL almacenar el secreto del token utilizando la función de hash criptográfico SHA-256 (según ADR-0010), indexado para búsqueda directa, sin almacenar jamás el valor original en texto plano.

#### Scenario: Verificación de persistencia en base de datos
- **WHEN** se persiste un nuevo `AccessToken` en PostgreSQL
- **THEN** el campo `tokenHash` almacena la representación hexadecimal del hash SHA-256 del token

### Requirement: Revocación inmediata desde el panel administrativo
El sistema SHALL permitir al dueño de un token revocarlo en cualquier momento desde el panel administrativo marcando `revokedAt = now()`, invalidándolo de forma efectiva a partir de la siguiente petición entrante.

#### Scenario: Revocación de un token activo
- **WHEN** el dueño de un token solicita su revocación desde `/admin/tokens`
- **THEN** el sistema actualiza `revokedAt` con la fecha/hora actual y cualquier llamada subsecuente con ese token es rechazada inmediatamente con error 401

### Requirement: Validación de autenticidad, expiración y scopes en peticiones
El sistema SHALL validar cada token presentado calculando su hash SHA-256 y comprobando que exista, pertenezca a un usuario activo, no esté revocado (`revokedAt IS NULL`), no esté expirado (`expiresAt IS NULL OR expiresAt > now()`) y cuente con el scope requerido para la operación.

#### Scenario: Validación de token con scope adecuado
- **WHEN** se presenta un token válido con scope `write` para una operación de escritura
- **THEN** el sistema autentica la petición y autoriza la ejecución

#### Scenario: Intento de operación de escritura con token de solo lectura
- **WHEN** se presenta un token válido pero configurado únicamente con scope `read` para una operación que requiere `write` o `delete`
- **THEN** el sistema rechaza la llamada con código de error de autorización (403) sin ejecutar cambios

#### Scenario: Presentación de token revocado o expirado
- **WHEN** un cliente envía un token cuya fecha de expiración ha vencido o cuyo `revokedAt` está seteado
- **THEN** el sistema rechaza la llamada con error de autenticación (401)

### Requirement: Aislamiento estricto de tokens por usuario
El sistema SHALL restringir la consulta, emisión y revocación de tokens exclusivamente al usuario autenticado propietario (`ownerId === session.userId`).

#### Scenario: Intento de revocar token de otro usuario
- **WHEN** un usuario autenticado A intenta enviar una acción de revocación sobre un token perteneciente al usuario B
- **THEN** el sistema rechaza la operación con error 403 y mantiene el token intacto
