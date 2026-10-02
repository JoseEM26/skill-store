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
      <section
        data-testid="version-history"
        className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6 md:p-8 shadow-sm text-center text-sm text-on-surface-variant"
      >
        No hay historial de versiones registrado.
      </section>
    );
  }

  return (
    <section
      data-testid="version-history"
      className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6 md:p-8 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-container-highest">
        <div>
          <h2 className="text-xl font-bold font-headline tracking-tight text-on-surface flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Historial de versiones y Changelog
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5 font-body">Trazabilidad de cambios, especificaciones y compatibilidad con modelos Claude.</p>
        </div>
        <span className="text-xs font-mono font-medium text-outline px-2.5 py-1 rounded bg-surface-container-low border border-surface-container-highest self-start sm:self-auto">
          {versions.length} {versions.length === 1 ? 'versión publicada' : 'versiones publicadas'}
        </span>
      </div>

      {/* Timeline Feed */}
      <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-[11px] sm:before:left-[15px] before:top-3 before:bottom-3 before:w-0.5 before:bg-surface-container-highest">
        {versions.map((ver, idx) => (
          <div key={ver.id || ver.version} className="relative group" data-testid={`version-item-${ver.version}`}>
            {/* Timeline dot */}
            <div
              className={`absolute -left-6 sm:-left-8 top-1 w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest ${
                idx === 0 ? 'bg-primary ring-4 ring-primary-container/40' : 'bg-outline-variant'
              }`}
            />
            <div className="bg-surface-container-low/50 rounded-lg p-5 border border-surface-container-highest hover:border-primary-fixed-dim transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-on-surface bg-surface-container-lowest px-2 py-0.5 rounded border border-surface-container-highest">
                    v{ver.version}
                  </span>
                  {idx === 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-label font-semibold bg-secondary-container text-on-secondary-fixed border border-secondary-fixed-dim">
                      Última
                    </span>
                  )}
                  {ver.gitTag && (
                    <span className="font-mono text-xs text-on-surface-variant flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {ver.gitTag}
                    </span>
                  )}
                </div>
                <time className="text-xs text-outline font-body flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(ver.publishedAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </div>

              {ver.changelog ? (
                <p className="text-sm text-on-surface-variant font-body leading-relaxed mt-2.5">
                  {ver.changelog}
                </p>
              ) : (
                <p className="text-xs italic text-outline mt-2.5 font-body">
                  Sin notas de versión.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

