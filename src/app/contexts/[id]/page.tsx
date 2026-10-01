import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicContextById } from '@/lib/catalog/queries';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ContextDetailPage({ params }: PageProps) {
  const { id } = await params;

  const context = await getPublicContextById(id);

  if (!context) {
    notFound();
  }

  const isExternal = context.type === 'external_reference';

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          Catálogo
        </Link>
        <span>/</span>
        <span className="text-zinc-700 dark:text-zinc-300">Contextos</span>
        <span>/</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{context.title}</span>
      </nav>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              isExternal
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}
          >
            {isExternal ? 'Referencia Externa' : 'Idea Pública'}
          </span>

          <time className="text-xs text-zinc-500 dark:text-zinc-400">
            Actualizado el{' '}
            {new Date(context.updatedAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            {context.title}
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Compartido por <span className="font-semibold text-zinc-800 dark:text-zinc-200">@{context.owner.username}</span>
          </p>
        </div>

        {context.link && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Enlace de referencia:</span>
            <div className="mt-1 truncate">
              <a
                href={context.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {context.link} ↗
              </a>
            </div>
          </div>
        )}

        {context.body && (
          <div className="prose prose-zinc max-w-none text-sm leading-relaxed text-zinc-700 dark:prose-invert dark:text-zinc-300 whitespace-pre-line">
            {context.body}
          </div>
        )}

        {context.tags && context.tags.length > 0 && (
          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Etiquetas:</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {context.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
