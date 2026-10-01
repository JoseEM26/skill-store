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
      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
    >
      <span>📥 {downloading ? 'Descargando...' : 'Descargar'}</span>
    </button>
  );
}
