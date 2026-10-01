import Link from 'next/link';
import { CatalogContextItem } from '@/lib/catalog/queries';

export function ContextCard({ context }: { context: CatalogContextItem }) {
  const isExternal = context.type === 'external_reference';
  const detailUrl = `/contexts/${context.id}`;

  return (
    <div
      data-testid="context-card"
      className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isExternal
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {isExternal ? 'Referencia Externa' : 'Idea Pública'}
            </span>
            {context.isArchived && (
              <span
                data-testid="archived-badge"
                className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
              >
                Archivado
              </span>
            )}
          </div>
        </div>

        <h3 className="mt-3 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          <Link href={detailUrl} className="hover:underline">
            {context.title}
          </Link>
        </h3>

        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          por <span className="font-medium text-zinc-700 dark:text-zinc-300">@{context.owner.username}</span>
        </p>

        {context.body && (
          <p className="mt-3 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-300">
            {context.body}
          </p>
        )}

        {context.tags && context.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {context.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        {context.link ? (
          <a
            href={context.link}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-medium text-zinc-600 hover:text-blue-600 hover:underline dark:text-zinc-400 dark:hover:text-blue-400"
          >
            🔗 {context.link.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span />
        )}
        <Link
          href={detailUrl}
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Ver contexto →
        </Link>
      </div>
    </div>
  );
}
