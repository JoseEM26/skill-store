import Link from 'next/link';
import { CatalogSkillItem } from '@/lib/catalog/queries';

export function SkillCard({ skill }: { skill: CatalogSkillItem }) {
  const versionStr = skill.latestVersion ? `v${skill.latestVersion.version}` : 'v1.0.0';
  const detailUrl = `/skills/${skill.owner.username}/${skill.slug}`;

  return (
    <article
      data-testid="skill-card"
      className="bg-surface-container-lowest border border-surface-container-highest hover:border-primary-fixed-dim rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
    >
      <div>
        {/* Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary-fixed text-on-secondary-fixed">
              Skill
            </span>
            {skill.isArchived && (
              <span
                data-testid="archived-badge"
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
              >
                Archivado
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container text-on-surface-variant border border-surface-container-highest">
              {versionStr}
            </span>
          </div>
          {skill.license && (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono text-outline font-medium border border-surface-container-highest">
              {skill.license}
            </span>
          )}
        </div>

        {/* Title & Author */}
        <h3 className="font-mono text-sm font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight mb-1">
          <Link href={detailUrl}>
            {skill.name}
          </Link>
        </h3>
        <p className="font-body text-xs text-outline mb-3">
          por <span className="text-on-surface-variant font-medium">@{skill.owner.username}</span>
        </p>

        {/* Description */}
        <p className="font-body text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-4">
          {skill.description || 'Sin descripción disponible.'}
        </p>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-surface-container-high flex items-center justify-between text-xs text-on-surface-variant">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" title="Descargas">
            <svg className="w-3.5 h-3.5 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="font-mono text-[11px]">{skill.downloadsCount} descargas</span>
          </div>
          <div className="flex items-center gap-1" title="Instalaciones">
            <svg className="w-3.5 h-3.5 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-mono text-[11px]">{skill.installsCount} installs</span>
          </div>
        </div>
        <Link
          href={detailUrl}
          className="font-headline font-semibold text-primary hover:text-primary-dim inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
        >
          Ver detalle <span className="text-sm">→</span>
        </Link>
      </div>
    </article>
  );
}

