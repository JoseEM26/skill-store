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
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero & Search Area */}
      <div className="max-w-4xl mx-auto text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-fixed text-xs font-mono font-medium tracking-tight">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          v2.4.0 Engine Compatible • Claude 3.5 Sonnet
        </div>

        <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface">
          Catálogo Público de Skills y Contextos
        </h1>

        <p className="font-body text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          Descubre, instala y comparte capacidades modulares y paquetes de contexto para Claude Code y flujos de IA.
        </p>

        {/* Search & Filter section */}
        <div className="pt-4 max-w-3xl mx-auto">
          <SearchInput />
        </div>
      </div>

      {/* Catalog Controls / Subheader Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 mb-6 border-b border-surface-container-highest">
        <div className="flex items-center gap-2">
          <span className="font-body text-xs font-medium text-on-surface-variant">
            Mostrando <span className="font-semibold text-on-surface">{total} recursos</span>
            {skillsCount > 0 && ` (${skillsCount} skills`}
            {contextsCount > 0 && `, ${contextsCount} contextos)`}
          </span>
          <span className="inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
          <span className="text-xs text-outline-variant">Verificados por la comunidad</span>
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {items.map((item) => {
            if (item.kind === 'skill') {
              return <SkillCard key={`skill-${item.id}`} skill={item} />;
            }
            return <ContextCard key={`context-${item.id}`} context={item} />;
          })}
        </div>
      )}

      {/* Quick Install Terminal Banner */}
      <div className="mt-12 bg-surface-container-low border border-surface-container-highest rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-headline text-sm font-semibold text-on-surface">Instala directamente desde la línea de comandos</h3>
            <p className="font-body text-xs text-on-surface-variant">Utiliza el CLI oficial de CloudCode para añadir skills a tus proyectos al instante.</p>
          </div>
        </div>
        <div className="w-full md:w-auto flex items-center gap-2 bg-surface-container-lowest border border-surface-container-highest rounded-lg px-3.5 py-2 font-mono text-xs text-on-surface">
          <span className="text-outline">$</span>
          <span>npx skills add Aybar-Corp/architecture-planner</span>
        </div>
      </div>
    </main>
  );
}

