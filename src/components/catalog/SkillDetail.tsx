import Link from 'next/link';
import { SkillDetailResult } from '@/lib/catalog/queries';
import { InstallSnippet } from './InstallSnippet';
import { VersionHistory } from './VersionHistory';
import { DownloadButton } from './DownloadButton';

export function SkillDetail({ skill }: { skill: SkillDetailResult }) {
  const currentVersionStr = skill.latestVersion ? `v${skill.latestVersion.version}` : 'v1.0.0';

  return (
    <div data-testid="skill-detail-view" className="space-y-8">
      {/* Sub-Header Breadcrumb Bar */}
      <nav aria-label="Breadcrumb" className="flex items-center text-xs font-mono text-on-surface-variant gap-1.5">
        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1 font-body text-xs font-normal">
          <svg className="w-3.5 h-3.5 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Catálogo
        </Link>
        <span className="text-outline-variant font-sans">/</span>
        <span className="text-on-surface-variant font-medium">@{skill.owner.username}</span>
        <span className="text-outline-variant font-sans">/</span>
        <span className="text-on-surface font-semibold tracking-tight">{skill.slug}</span>
      </nav>

      {/* Primary Skill Detail Card */}
      <article className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left: Identifiers, Title, Desc, Meta */}
          <div className="flex-1 space-y-4">
            {/* Badges & Pill Header */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-label bg-secondary-container text-on-secondary-fixed border border-secondary-fixed-dim">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Skill
              </span>
              {skill.isArchived && (
                <span
                  data-testid="archived-badge"
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                >
                  Archivado
                </span>
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-surface-container text-on-surface-variant border border-surface-container-highest">
                {currentVersionStr}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono text-primary bg-primary-fixed/20 border border-primary-fixed-dim">
                <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Oficial Claude Code
              </span>
            </div>

            {/* Main Title */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold font-headline tracking-tight text-on-surface font-mono">
                {skill.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-on-surface-variant pt-0.5">
                <span>Publicado por</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-on-surface">
                  <span className="w-5 h-5 rounded-full bg-surface-container-high border border-surface-container-highest flex items-center justify-center text-[10px] font-bold font-mono text-primary">
                    {skill.owner.username.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="font-mono text-xs font-semibold">@{skill.owner.username}</span>
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-on-surface-variant text-base leading-relaxed max-w-3xl font-body">
              {skill.description || 'Sin descripción disponible.'}
            </p>

            {/* Metrics / Meta Badges Inline */}
            <div className="pt-4 border-t border-surface-container-highest flex flex-wrap items-center gap-y-3 gap-x-6 text-xs text-on-surface-variant">
              {/* License */}
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-outline">Licencia:</span>
                <span className="font-mono font-medium text-on-surface px-1.5 py-0.5 rounded bg-surface-container-low border border-surface-container-highest">
                  {skill.license || 'MIT'}
                </span>
              </div>
              <div className="h-3 w-px bg-surface-container-highest hidden sm:block"></div>
              {/* Downloads */}
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-outline">Descargas:</span>
                <span data-testid="skill-downloads-count" className="font-mono font-semibold text-on-surface">
                  {skill.downloadsCount}
                </span>
              </div>
              <div className="h-3 w-px bg-surface-container-highest hidden sm:block"></div>
              {/* Installs */}
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-outline">Instalaciones:</span>
                <span data-testid="skill-installs-count" className="font-mono font-semibold text-on-surface">
                  {skill.installsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Primary Call to Actions */}
          <div className="flex sm:flex-row lg:flex-col gap-3 min-w-[200px] shrink-0 pt-2 lg:pt-0">
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
                className="flex-1 lg:w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface border border-surface-container-highest text-sm font-medium transition-colors duration-150"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>Ver en GitHub</span>
                <svg className="w-3.5 h-3.5 text-outline shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </article>

      {/* Installation Command Card */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6 md:p-7 shadow-sm">
        <InstallSnippet owner={skill.owner.username} slug={skill.slug} />
      </div>

      {/* Version History & Changelog */}
      <VersionHistory versions={skill.versions} />
    </div>
  );
}

