# Spec Delta

## Purpose
Provee autenticación federada mediante GitHub OAuth, emisión y validación de tokens de sesión JWT con expiración configurable, sincronización de la identidad del usuario en PostgreSQL y protección de rutas del panel administrativo.

## ADDED Requirements

### Requirement: Autenticación exclusiva vía GitHub OAuth
El sistema SHALL permitir el inicio de sesión únicamente a través del proveedor GitHub OAuth, rechazando cualquier intento de autenticación local con usuario y contraseña.

#### Scenario: Inicio de sesión exitoso con cuenta de GitHub
- **WHEN** un usuario inicia el flujo de autenticación con una cuenta válida de GitHub
- **THEN** el sistema completa el handshake OAuth y autentica al usuario

#### Scenario: Intento de inicio de sesión sin proveedor OAuth
- **WHEN** un usuario o cliente intenta autenticarse mediante credenciales locales de email/password
- **THEN** el sistema rechaza la solicitud indicando que no está soportada

### Requirement: Emisión y verificación de sesión basada en JWT firmado
El sistema SHALL emitir una sesión basada en JSON Web Token (JWT) firmado criptográficamente, cuyo tiempo de expiración sea configurable mediante variables de entorno, e invalidar el acceso cuando el token expire.

#### Scenario: Emisión de token tras login exitoso
- **WHEN** el usuario completa satisfactoriamente el flujo OAuth de GitHub
- **THEN** el sistema emite una cookie de sesión con el JWT firmado conteniendo el identificador de usuario (`userId`, `githubId`, `username`) y tiempo de expiración establecido

#### Scenario: Acceso con JWT expirado
- **WHEN** un cliente presenta un JWT cuya fecha de expiración (`exp`) ha sido superada
- **THEN** el sistema rechaza la sesión y exige reautenticación

### Requirement: Sincronización automática de perfil de usuario en base de datos
El sistema SHALL registrar un nuevo usuario o actualizar el registro existente en la tabla `User` con los datos provistos por GitHub (`githubId`, `username`, `avatarUrl`) en cada inicio de sesión.

#### Scenario: Primer login de un usuario
- **WHEN** un usuario se autentica por primera vez con su cuenta de GitHub
- **THEN** el sistema crea un nuevo registro en la tabla `User` con su `githubId`, `username` y `avatarUrl`

#### Scenario: Login recurrente con datos actualizados en GitHub
- **WHEN** un usuario existente inicia sesión y sus datos de `username` o `avatarUrl` cambiaron en GitHub
- **THEN** el sistema actualiza el registro correspondiente en la tabla `User` manteniendo su `id` primario

### Requirement: Protección y redirección de rutas administrativas
El sistema SHALL interceptar las peticiones a las rutas bajo `/admin` y denegar el acceso no autenticado redirigiendo al flujo de login.

#### Scenario: Acceso a ruta administrativa sin sesión
- **WHEN** un usuario no autenticado solicita navegar a `/admin` o cualquiera de sus subrutas
- **THEN** el sistema redirige al usuario a la página de login conservando la URL de retorno

#### Scenario: Acceso a ruta administrativa con sesión válida
- **WHEN** un usuario con sesión JWT válida solicita navegar a `/admin`
- **THEN** el sistema permite el acceso a la vista administrativa y muestra la información del usuario autenticado

### Requirement: Cierre de sesión
El sistema SHALL permitir al usuario autenticado cerrar su sesión, eliminando la cookie de sesión activa.

#### Scenario: Cierre de sesión exitoso
- **WHEN** un usuario autenticado solicita cerrar sesión
- **THEN** el sistema destruye la cookie de sesión JWT y redirige al catálogo público
