# Tasks

## 1. Backend: Ruteo y Manejo de Conflictos de Slugs

- [x] 1.1 Implementar funciones de consulta en base de datos para resolver skills mediante `{owner: username, slug}` usando Prisma, y verificar con tests unitarios en Vitest.
- [x] 1.2 Agregar manejo de errores para capturar violaciones de unicidad `[ownerId, slug]` retornando `409 Conflict` en endpoints de publicación/creación, y verificar mediante tests de integración.
- [x] 1.3 Adaptar los route handlers REST (`/api/skills/[owner]/[slug]`, detalle, versiones y changelog) para operar bajo el namespace `{owner}/{slug}`, y verificar respuestas HTTP 200 y 404/409.

## 2. Frontend: Rutas Anidadas de App Router

- [x] 2.1 Configurar las rutas dinámicas en `src/app/skills/[owner]/[slug]/page.tsx` para resolver y mostrar la skill especificada, verificando la coexistencia de dos páginas con mismo slug de dueños distintos.
- [x] 2.2 Actualizar las cards del catálogo público y barras de navegación para enlazar hacia `/skills/[owner]/[slug]`, verificando que todos los links se generen con su dueño respectivo.

## 3. Servidor MCP: Tools con Namespace

- [x] 3.1 Actualizar las herramientas MCP (`get_skill`, `get_version`, `publish_skill`, etc.) para validar y aceptar `owner` y `slug` explícitos, y verificar con tests automatizados del SDK de MCP.
