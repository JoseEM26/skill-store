# Tasks

## 1. Módulo criptográfico y servicio de tokens

- [x] 1.1 Implementar en `lib/auth/tokens.ts` las funciones para generación de secretos seguros (`generateAccessToken`), cálculo de hash SHA-256 (`hashToken`) y validación de formato con prefijo `ccs_`, verificando con tests unitarios
- [x] 1.2 Implementar la función `validateAccessToken(rawToken, requiredScope)` que consulte `AccessToken` en Prisma por `tokenHash`, valide estado de revocación/expiración, verifique el array de scopes y actualice `lastUsedAt`
- [x] 1.3 Escribir tests unitarios exhaustivos para `validateAccessToken` cubriendo casos: token válido, token expirado, token revocado, scope insuficiente y token inexistente

## 2. Server Actions y control de acceso

- [x] 2.1 Implementar Server Action `createAccessTokenAction` con validación Zod (`label`, `scopes`, `expiresAt`), persistiendo `tokenHash` asociado a `session.userId` y retornando el token raw en la respuesta única
- [x] 2.2 Implementar Server Action `revokeAccessTokenAction` que marque `revokedAt = new Date()` filtrando estrictamente por `ownerId === session.userId`
- [x] 2.3 Escribir tests automatizados para Server Actions verificando que un usuario no pueda revocar tokens ajenos (error 403)

## 3. Vistas y componentes UI en `/admin/tokens`

- [x] 3.1 Construir la vista `/admin/tokens` (Server Component) que liste los tokens del usuario con sus labels, scopes, fechas de creación/expiración/último uso y estado de revocación
- [x] 3.2 Construir el formulario de creación de token con selección de scopes (`read`, `write`, `delete`) y fecha de expiración opcional
- [x] 3.3 Implementar el componente modal de revelación única que muestre el token raw generado con botón de copiado al portapapeles
- [x] 3.4 Escribir tests de componentes verificando el flujo de creación y revocación desde la interfaz

## 4. Verificación integral

- [x] 4.1 Ejecutar suite de pruebas completa con `pnpm test` verificando la cobertura y correcto funcionamiento de todo el ciclo de vida de tokens
