'use client';

import { useState } from 'react';

interface InstallSnippetProps {
  owner: string;
  slug: string;
}

export function InstallSnippet({ owner, slug }: InstallSnippetProps) {
  const [copied, setCopied] = useState(false);
  const command = `npx skills add ${owner}/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Comando de instalación
      </span>
      <div
        data-testid="install-snippet"
        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 font-mono text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
      >
        <span className="truncate">{command}</span>
        <button
          type="button"
          data-testid="copy-install-btn"
          onClick={handleCopy}
          className="shrink-0 rounded bg-white px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}
