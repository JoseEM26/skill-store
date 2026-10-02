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
      <body className="min-h-full flex flex-col bg-background text-on-surface font-body antialiased selection:bg-primary-container selection:text-on-primary-container">
        {/* Top Navigation Header */}
        <header className="bg-surface-container-lowest sticky top-0 z-50 shadow-sm border-b border-surface-container-highest">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            {/* Brand Logo / Product Name */}
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="font-headline text-base font-semibold tracking-tight text-on-surface flex items-center gap-2 group transition-all duration-150"
              >
                <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm group-hover:bg-primary-dim transition-colors">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-12-3l3-3-3-3 1.4-1.4 4.4 4.4-4.4 4.4L8 15zm5 0h4v2h-4v-2z" />
                  </svg>
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold tracking-tight">CloudCode</span>
                  <span className="text-xs font-mono text-on-surface-variant font-normal px-1.5 py-0.5 rounded bg-surface-container border border-surface-container-highest">
                    Registry
                  </span>
                </div>
              </Link>

              {/* Main Nav Links */}
              <nav className="hidden md:flex items-center space-x-1 font-headline text-sm font-medium tracking-tight">
                <Link
                  href="/"
                  className="text-primary font-semibold px-3 py-1.5 rounded-lg bg-surface-container-low transition-colors duration-150"
                >
                  Catálogo
                </Link>
                <Link
                  href="/admin/contexts"
                  className="text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors duration-150"
                >
                  Contextos
                </Link>
                <a
                  href="https://github.com/JoseEM26/skill-store"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors duration-150"
                >
                  GitHub
                </a>
              </nav>
            </div>

            {/* Trailing Action Cluster */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dim text-on-primary text-xs font-semibold px-3.5 py-2 rounded-lg transition-all duration-150 shadow-sm active:scale-95"
              >
                <svg aria-hidden="true" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>Sign in with GitHub</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>

        {/* Web Footer */}
        <footer className="bg-surface-container-low border-t border-surface-container-highest">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Brand & Copyright */}
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <span className="font-headline text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-primary text-on-primary flex items-center justify-center font-mono text-[9px] font-bold">
                  &gt;
                </span>
                CloudCode
              </span>
              <span className="hidden sm:inline text-surface-container-highest">•</span>
              <p className="font-body text-xs text-on-surface-variant">
                © 2025 CloudCode Skills Registry. Powered by Claude Code.
              </p>
            </div>

            {/* Links & Status */}
            <div className="flex flex-wrap items-center justify-center gap-5 font-body text-xs text-on-surface-variant">
              <a
                href="https://github.com/JoseEM26/skill-store"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-on-surface transition-colors duration-150"
              >
                GitHub
              </a>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Status: Online</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

