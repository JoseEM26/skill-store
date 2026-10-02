'use client';

import { useState } from 'react';
import { incrementDownloadAction } from '@/app/skills/actions';

interface DownloadButtonProps {
  owner: string;
  slug: string;
  name: string;
  description?: string | null;
  license?: string | null;
  version?: string | null;
}

export function DownloadButton({
  owner,
  slug,
  name,
  description,
  license,
  version,
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);

      // 1. Trigger atomic increment server action (public, no auth required)
      await incrementDownloadAction(owner, slug);

      // 2. Generate and download SKILL.md file
      const frontmatter = [
        '---',
        `name: ${name}`,
        `version: ${version || '1.0.0'}`,
        `description: ${description ? JSON.stringify(description) : '""'}`,
        `author: ${owner}`,
        `license: ${license || 'MIT'}`,
        '---',
        '',
        `# ${name}`,
        '',
        description || 'Sin descripción.',
      ].join('\n');

      const blob = new Blob([frontmatter], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'SKILL.md';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      // Ignored for UX smoothness
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      data-testid="download-skill-btn"
      onClick={handleDownload}
      disabled={downloading}
      className="flex-1 lg:w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dim text-on-primary text-sm font-semibold tracking-tight shadow-sm hover:shadow transition-all duration-150 active:scale-95 disabled:opacity-50 cursor-pointer"
    >
      <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span>{downloading ? 'Descargando...' : 'Descargar'}</span>
    </button>
  );
}

