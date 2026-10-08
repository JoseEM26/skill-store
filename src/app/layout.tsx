import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { UserMenu } from '@/components/layout/UserMenu';
import './globals.css';

export const metadata: Metadata = {
  title: 'CloudCode Skills Registry',
  description: 'Registro central de skills, ideas y referencias de contexto para Claude Code.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="es" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col bg-background text-on-surface font-body antialiased selection:bg-primary-container selection:text-on-primary-container"
        suppressHydrationWarning
      >
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
              <UserMenu user={session?.user ?? null} />
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

