'use client';

import { useState } from 'react';

interface InstallSnippetProps {
  owner: string;
  slug: string;
}

export function InstallSnippet({ owner, slug }: InstallSnippetProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'cli' | 'npm' | 'json'>('cli');

  const commands = {
    cli: `npx skills add ${owner}/${slug}`,
    npm: `npm install @cloudcode-skills/${slug}`,
    json: `{ "skills": ["@${owner}/${slug}@latest"] }`,
  };

  const activeCommand = commands[activeTab];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold font-headline text-on-surface">Comando de instalación</h2>
            <p className="text-xs text-on-surface-variant font-body">Agrega esta skill directamente a tu entorno de trabajo de Claude Code.</p>
          </div>
        </div>

        {/* Terminal tabs switch */}
        <div className="inline-flex p-1 bg-surface-container-low rounded-lg border border-surface-container-highest text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('cli')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'cli'
                ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            CLI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('npm')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'npm'
                ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            npm
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'json'
                ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            JSON Config
          </button>
        </div>
      </div>

      {/* Modern Monospace Dark Code Shell */}
      <div
        data-testid="install-snippet"
        className="relative group bg-inverse-surface rounded-lg p-4 sm:p-5 border border-secondary-dim text-surface shadow-inner"
      >
        {/* Terminal Header dots */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-dim/20 text-xs font-mono text-outline-variant">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-error/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed/60 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-primary-fixed/60 inline-block"></span>
            <span className="ml-2 text-inverse-on-surface text-[11px]">bash - claude-code-env</span>
          </div>
          <span className="text-[11px] text-inverse-on-surface font-mono">shell registry v2.4</span>
        </div>

        {/* Command Row */}
        <div className="flex items-center justify-between gap-4 font-mono text-sm sm:text-base">
          <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
            <span className="text-primary-fixed font-bold select-none">$</span>
            <code className="text-on-primary whitespace-nowrap tracking-wide">{activeCommand}</code>
          </div>
          {/* Copy Button */}
          <button
            type="button"
            data-testid="copy-install-btn"
            onClick={handleCopy}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-dim/30 hover:bg-surface-dim/60 text-surface-bright text-xs font-medium border border-outline-variant/30 transition-all duration-150 active:scale-95 cursor-pointer"
            title="Copiar comando al portapapeles"
          >
            <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Technical helper note */}
      <div className="flex items-start gap-2 text-xs text-on-surface-variant font-body pt-1">
        <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Este comando registrará el plugin en tu archivo local <code className="font-mono text-on-surface bg-surface-container px-1 py-0.5 rounded text-[11px]">.claude/skills.json</code> y activará los prompts automáticamente en la siguiente sesión de Claude Code.
        </span>
      </div>
    </section>
  );
}

