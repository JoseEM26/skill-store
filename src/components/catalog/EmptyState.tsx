import Link from 'next/link';

interface EmptyStateProps {
  title?: string;
  description?: string;
  showReset?: boolean;
}

export function EmptyState({
  title = 'No se encontraron resultados',
  description = 'No hay skills ni contextos que coincidan con los filtros de búsqueda aplicados.',
  showReset = true,
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-container-highest bg-surface-container-lowest/50 p-12 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h3 className="mt-4 font-headline text-base font-semibold text-on-surface">
        {title}
      </h3>
      <p className="mt-1 max-w-sm font-body text-xs text-on-surface-variant leading-relaxed">
        {description}
      </p>
      {showReset && (
        <Link
          href="/"
          className="mt-5 inline-flex items-center rounded-lg bg-primary hover:bg-primary-dim px-4 py-2 text-xs font-semibold text-on-primary shadow-xs transition-all active:scale-95"
        >
          Limpiar filtros
        </Link>
      )}
    </div>
  );
}

