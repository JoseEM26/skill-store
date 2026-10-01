import { getPublicCatalog } from '@/lib/catalog/queries';
import { SkillCard } from '@/components/catalog/SkillCard';
import { ContextCard } from '@/components/catalog/ContextCard';
import { SearchInput } from '@/components/catalog/SearchInput';
import { EmptyState } from '@/components/catalog/EmptyState';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
  }>;
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  const type = resolvedParams.type || 'all';

  const { items, total, skillsCount, contextsCount } = await getPublicCatalog({
    q,
    type,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero section */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Catálogo Público de Skills y Contextos
        </h1>
        <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
          Descubre e instala herramientas, notas y referencias de contexto para tus sesiones de Claude Code.
        </p>
      </div>

      {/* Search & Filter section */}
      <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <SearchInput />
      </div>

      {/* Metrics overview */}
      <div className="mb-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <div>
          Mostrando <span className="font-semibold text-zinc-800 dark:text-zinc-200">{total}</span> recursos
          {skillsCount > 0 && ` (${skillsCount} skills`}
          {contextsCount > 0 && `, ${contextsCount} contextos)`}
        </div>
      </div>

      {/* Items Grid or Empty State */}
      {items.length === 0 ? (
        <EmptyState
          title="No se encontraron recursos"
          description={
            q
              ? `No hay resultados para la búsqueda "${q}". Intenta con otros términos o limpia los filtros.`
              : 'Actualmente no hay recursos públicos disponibles.'
          }
        />
      ) : (
        <div
          data-testid="catalog-grid"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => {
            if (item.kind === 'skill') {
              return <SkillCard key={`skill-${item.id}`} skill={item} />;
            }
            return <ContextCard key={`context-${item.id}`} context={item} />;
          })}
        </div>
      )}
    </main>
  );
}
