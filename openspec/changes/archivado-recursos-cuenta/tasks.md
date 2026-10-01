# Tasks

## 1. Backend: Servicio Transaccional de Baja de Cuenta

- [ ] 1.1 Implementar `deleteAccountService` con `$transaction` en Prisma para eliminar ideas privadas y tokens, y actualizar `isArchived = true` en skills y contextos públicos, verificando con tests unitarios en Vitest.
- [ ] 1.2 Implementar route handler / Server Action para procesar la baja de cuenta del usuario autenticado, y verificar con test de integración que la sesión y tokens queden destruidos.

## 2. Bloqueo de Mutaciones en Recursos Archivados

- [ ] 2.1 Agregar validación en los servicios de actualización/eliminación de skills y contextos para rechazar mutaciones si `isArchived === true`, y verificar mediante tests unitarios de rechazo con error 403.
- [ ] 2.2 Integrar el guard de archivado en los route handlers REST y Server Actions de escritura, verificando con tests HTTP.

## 3. Frontend y MCP: Indicadores de Archivado

- [ ] 3.1 Actualizar las vistas de detalle y cards de catálogo para mostrar un badge visual de "Archivado" y deshabilitar botones de edición para recursos con `isArchived: true`, verificando el renderizado en componentes.
- [ ] 3.2 Verificar que el servidor MCP permita consultar e instalar skills archivadas pero rechace tools de mutación (`update_context`, `publish_skill`, `delete_skill`) sobre las mismas con tests de integración.
