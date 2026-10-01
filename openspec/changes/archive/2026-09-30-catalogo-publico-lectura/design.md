# Design

## Context

Ver `proposal.md` y `specs/public-catalog/spec.md`. La base de datos PostgreSQL local (Docker, puerto 5433) contiene el modelo Prisma (`User`, `Skill`, `SkillVersion`, `Context`, `AccessToken`). El ítem #4 (`github-actions-ingesta`) provee los datos de skills ingeridos. El diseño visual detallado de Stitch (ítem #2) aún no está completado, por lo que la interfaz se estructurará con componentes funcionales y limpios en Tailwind CSS que cumplen con la arquitectura de información definida.

## Goals / Non-Goals

**Goals:**
- Implementar la interfaz pública de lectura utilizando React Server Components (RSC) que consultan PostgreSQL directamente vía Prisma (ADR-0005).
- Rutear y direccionar skills por `[owner]/[slug]` (ADR-0004) y contextos por `[id]`.
- Manejar búsqueda y filtros de catálogo exclusivamente mediante query parameters en la URL (`?q=...&type=...`).
- Garantizar aislamiento de datos privados: nunca exponer ideas privadas (`isPublic = false`) ni recursos archivados (`isArchived = true`).

**Non-Goals:**
- Funcionalidades de autenticación / login (reservado para el ítem #6).
- Formularios de creación o edición (reservado para el panel admin en el ítem #7).
- Incremento real de contadores de popularidad en base de datos (se estructura el botón visual de instalación/descarga; la mutación de contadores es el ítem #11).

## Decisions

### 1. Arquitectura de Páginas y Componentes (App Router)
- **Decisión:** 
  - Catálogo principal: `src/app/page.tsx` (RSC) que lee `searchParams` y delega en consultas Prisma (`src/lib/catalog/queries.ts`).
  - Detalle de skill: `src/app/skills/[owner]/[slug]/page.tsx` (RSC) con subcomponentes para metadatos, comando de instalación y lista histórica de versiones (`VersionHistory.tsx`).
  - Detalle de contexto: `src/app/contexts/[id]/page.tsx` (RSC).
- **Razón:** Sigue Next.js App Router nativo sin capas de API intermedias innecesarias para lectura interna (ADR-0005).
- **Alternativas consideradas:**
  - *Consumir la API REST interna desde los Server Components vía `fetch`:* Descartado por redundancia; en App Router los RSC consultan Prisma directamente con tipado estático completo.

### 2. Manejo de Búsqueda y Filtros en la URL
- **Decisión:** Un componente de cliente ligero (`<SearchInput />`) actualiza los searchParams en la URL (`useRouter` / `useSearchParams`) sin ningún store global (Zustand/Redux).
- **Razón:** Conforme a ADR-0005, el estado vive en la URL y el renderizado se realiza en el servidor.
- **Alternativas consideradas:**
  - *Estado local con filtrado en memoria en el cliente:* Descartado para soportar paginación o datasets mayores en el servidor y permitir URLs compartibles con filtros activos.

### 3. Abstracción del Diseño Visual previo a Stitch (Ítem #2)
- **Decisión:** Implementar una jerarquía visual limpia con Tailwind CSS (cards, badges de tags/versión, acordeón o lista para changelog, empty state y error boundary) basada en el PRD y TECH-DESIGN, dejando los componentes desacoplados para recibir ajustes cosméticos cuando los mockups de Stitch estén disponibles.
- **Razón:** Evita bloquear el desarrollo del flujo de lectura pública mientras se definen los mockups visuales.

## Risks / Trade-offs

- [Ajustes de estilo posteriores cuando se incorporen los mockups de Stitch] → Mitigación: Separar claramente la lógica de datos/RSC de los componentes visuales de presentación (`SkillCard`, `ContextCard`, `ChangelogItem`).
- [Rendimiento de búsqueda textual en PostgreSQL sin índices avanzados] → Mitigación: Utilizar filtros `contains` (o `ILIKE` en Prisma) sobre campos indexados (`title`, `name`, `description`); para el volumen del MVP es instantáneo.

## Open Questions

- *Diseño definitivo de la card de Contexto vs Skill:* ¿Se mostrarán en pestañas separadas o en un único feed unificado con selector de filtro? (La implementación soportará ambas vistas mediante el filtro `?type=all|skills|contexts`).
