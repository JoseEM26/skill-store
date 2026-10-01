import Link from 'next/link';
import { SkillDetailResult } from '@/lib/catalog/queries';
import { InstallSnippet } from './InstallSnippet';
import { VersionHistory } from './VersionHistory';
import { DownloadButton } from './DownloadButton';

export function SkillDetail({ skill }: { skill: SkillDetailResult }) {
  const currentVersionStr = skill.latestVersion ? `v${skill.latestVersion.version}` : 'v1.0.0';

  return (
    <div data-testid="skill-detail-view" className="space-y-8">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          Catálogo
        </Link>
        <span>/</span>
        <span className="text-zinc-700 dark:text-zinc-300">@{skill.owner.username}</span>
        <span>/</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{skill.slug}</span>
      </nav>

      {/* Header section */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
                {skill.name}
              </h1>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                Skill
              </span>
              {skill.isArchived && (
                <span
                  data-testid="archived-badge"
                  className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                >
                  Archivado
                </span>
              )}
              <span className="rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-mono font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {currentVersionStr}
              </span>
            </div>

            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Publicado por <span className="font-semibold text-zinc-800 dark:text-zinc-200">@{skill.owner.username}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DownloadButton
              owner={skill.owner.username}
              slug={skill.slug}
              name={skill.name}
              description={skill.description}
              license={skill.license}
              version={skill.latestVersion?.version}
            />
            {skill.repositoryUrl && (
              <a
                href={skill.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="github-repo-link"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                <span>📦 Ver en GitHub</span>
              </a>
            )}
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {skill.description || 'Sin descripción disponible.'}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Licencia: </span>
            {skill.license || 'No especificada'}
          </div>
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Descargas: </span>
            <span data-testid="skill-downloads-count">{skill.downloadsCount}</span>
          </div>
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Instalaciones: </span>
            <span data-testid="skill-installs-count">{skill.installsCount}</span>
          </div>
        </div>
      </div>

      {/* Installation Snippet */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <InstallSnippet owner={skill.owner.username} slug={skill.slug} />
      </div>

      {/* Version History & Changelog */}
      <VersionHistory versions={skill.versions} />
    </div>
  );
}
