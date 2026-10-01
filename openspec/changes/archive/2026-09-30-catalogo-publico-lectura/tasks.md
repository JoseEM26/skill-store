# Tasks

## 1. Consultas de Datos en el Servidor (Prisma)

- [x] 1.1 Implementar las funciones de consulta para el catálogo público (`src/lib/catalog/queries.ts`) soportando búsqueda por texto (`q`) y filtrado por tipo (`type`), garantizando el filtrado estricto de recursos públicos (`isPublic = true`) y no archivados (`isArchived = false`), y verificar su correcto funcionamiento con tests unitarios e integración en Vitest (`pnpm test`).
- [x] 1.2 Implementar la función de consulta de detalle de skill por combinación `owner` y `slug` (`getSkillByOwnerAndSlug`), incluyendo metadatos del dueño, última versión y lista completa de versiones ordenadas, y verificar con tests en Vitest.
- [x] 1.3 Implementar la función de consulta de detalle de contexto público (`getPublicContextById`), asegurando que cualquier contexto privado retorne `null`, y verificar con tests unitarios en Vitest.

## 2. Componentes de Presentación y Búsqueda

- [x] 2.1 Crear los componentes visuales de card y estados vacíos (`src/components/catalog/SkillCard.tsx`, `ContextCard.tsx`, `EmptyState.tsx`) estilizados con Tailwind CSS, y verificar su estructura y renderizado con React Testing Library.
- [x] 2.2 Crear el componente cliente `<SearchInput />` (`src/components/catalog/SearchInput.tsx`) para gestionar el input de búsqueda y actualización de query params en la URL sin stores globales, y verificar el comportamiento del input con tests en React Testing Library.
- [x] 2.3 Crear los componentes de detalle de skill (`src/components/catalog/SkillDetail.tsx`, `VersionHistory.tsx`, `InstallSnippet.tsx`) para exponer comandos de instalación, métricas y changelog histórico de versiones, y verificar con tests en React Testing Library.

## 3. Páginas y Rutas Públicas (React Server Components)

- [x] 3.1 Implementar la página principal del catálogo (`src/app/page.tsx`) como React Server Component que lee `searchParams`, invoca las consultas a PostgreSQL y renderiza el listado o el estado vacío, verificando la integración visual y funcional en local con `pnpm dev`.
- [x] 3.2 Implementar la ruta dinámica de detalle de skill (`src/app/skills/[owner]/[slug]/page.tsx`) con manejo de 404 (`notFound()`) para skills no existentes, verificando con pruebas de integración de rutas.
- [x] 3.3 Implementar la ruta de detalle de contexto (`src/app/contexts/[id]/page.tsx`) con renderizado de contenido, tags y manejo de 404 para ideas privadas, verificando con pruebas de integración.
