import Link from 'next/link';
import { CatalogContextItem } from '@/lib/catalog/queries';

export function ContextCard({ context }: { context: CatalogContextItem }) {
  const isExternal = context.type === 'external_reference';
  const detailUrl = `/contexts/${context.id}`;

  return (
    <article
      data-testid="context-card"
      className="bg-surface-container-lowest border border-surface-container-highest hover:border-primary-fixed-dim rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
    >
      <div>
        {/* Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                isExternal
                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                  : 'bg-tertiary-fixed text-on-tertiary-fixed'
              }`}
            >
              {isExternal ? 'Referencia Externa' : 'Idea Pública'}
            </span>
            {context.isArchived && (
              <span
                data-testid="archived-badge"
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
              >
                Archivado
              </span>
            )}
          </div>
        </div>

        {/* Title & Author */}
        <h3 className="font-mono text-sm font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight mb-1">
          <Link href={detailUrl}>
            {context.title}
          </Link>
        </h3>
        <p className="font-body text-xs text-outline mb-3">
          por <span className="text-on-surface-variant font-medium">@{context.owner.username}</span>
        </p>

        {/* Body Description */}
        {context.body && (
          <p className="font-body text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-4">
            {context.body}
          </p>
        )}

        {/* Tags */}
        {context.tags && context.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {context.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container-low text-on-surface-variant border border-surface-container-highest"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-surface-container-high flex items-center justify-between text-xs text-on-surface-variant">
        {context.link ? (
          <a
            href={context.link}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-mono text-[11px] text-on-surface-variant hover:text-primary transition-colors max-w-[160px] flex items-center gap-1"
          >
            <span>🔗</span>
            <span className="truncate">{context.link.replace(/^https?:\/\//, '')}</span>
          </a>
        ) : (
          <span />
        )}
        <Link
          href={detailUrl}
          className="font-headline font-semibold text-primary hover:text-primary-dim inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
        >
          Ver contexto <span className="text-sm">→</span>
        </Link>
      </div>
    </article>
  );
}

