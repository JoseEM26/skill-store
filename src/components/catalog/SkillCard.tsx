import Link from 'next/link';
import { CatalogSkillItem } from '@/lib/catalog/queries';

export function SkillCard({ skill }: { skill: CatalogSkillItem }) {
  const versionStr = skill.latestVersion ? `v${skill.latestVersion.version}` : 'v1.0.0';
  const detailUrl = `/skills/${skill.owner.username}/${skill.slug}`;

  return (
    <div
      data-testid="skill-card"
      className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              Skill
            </span>
            {skill.isArchived && (
              <span
                data-testid="archived-badge"
                className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
              >
                Archivado
              </span>
            )}
            <span className="ml-2 inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {versionStr}
            </span>
          </div>
          {skill.license && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {skill.license}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          <Link href={detailUrl} className="hover:underline">
            {skill.name}
          </Link>
        </h3>

        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          por <span className="font-medium text-zinc-700 dark:text-zinc-300">@{skill.owner.username}</span>
        </p>

        <p className="mt-3 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-300">
          {skill.description || 'Sin descripción disponible.'}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <div className="flex items-center gap-3">
          <span>📥 {skill.downloadsCount} descargas</span>
          <span>⚡ {skill.installsCount} installs</span>
        </div>
        <Link
          href={detailUrl}
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Ver detalle →
        </Link>
      </div>
    </div>
  );
}
