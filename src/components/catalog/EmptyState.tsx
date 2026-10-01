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
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
        🔍
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
      {showReset && (
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Limpiar filtros
        </Link>
      )}
    </div>
  );
}
