import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'CloudCode Skills Registry',
  description: 'Registro central de skills, ideas y referencias de contexto para Claude Code.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        {/* Header Navigation */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  ⚡
                </span>
                <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  CloudCode Registry
                </span>
              </Link>
            </div>

            <nav className="flex items-center gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Catálogo
              </Link>
              <a
                href="https://github.com/Aybar-Corp/Skill-store"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1">
          {children}
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-200 bg-white py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <div className="mx-auto max-w-6xl px-4">
            CloudCode Skills Registry — Registro de skills y contextos para Claude Code.
          </div>
        </footer>
      </body>
    </html>
  );
}
