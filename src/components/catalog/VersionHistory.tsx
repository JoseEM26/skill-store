interface VersionItem {
  id: string;
  version: string;
  changelog: string | null;
  gitTag: string | null;
  publishedAt: Date;
}

export function VersionHistory({ versions }: { versions: VersionItem[] }) {
  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
        No hay historial de versiones registrado.
      </div>
    );
  }

  return (
    <div data-testid="version-history" className="space-y-4">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Historial de versiones y Changelog
      </h3>

      <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {versions.map((ver, idx) => (
          <div key={ver.id || ver.version} className="p-4" data-testid={`version-item-${ver.version}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  v{ver.version}
                </span>
                {idx === 0 && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Última
                  </span>
                )}
                {ver.gitTag && (
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    🏷️ {ver.gitTag}
                  </span>
                )}
              </div>
              <time className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(ver.publishedAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </div>

            {ver.changelog ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {ver.changelog}
              </p>
            ) : (
              <p className="mt-2 text-xs italic text-zinc-400">
                Sin notas de versión.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
