import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createAccessToken } from '@/lib/auth/tokens';
import { CliAuthCallback } from './CliAuthCallback';

interface PageProps {
  searchParams: Promise<{
    port?: string;
    state?: string;
  }>;
}

export default async function CliAuthPage({ searchParams }: PageProps) {
  const session = await auth();

  const resolvedParams = await searchParams;
  const portParam = resolvedParams?.port;
  const stateParam = resolvedParams?.state;

  if (!session?.user?.id) {
    const callbackUrl = `/admin/cli-auth?port=${encodeURIComponent(portParam || '')}&state=${encodeURIComponent(stateParam || '')}`;
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    return null;
  }

  const portNum = Number(portParam);
  const isValidPort = Number.isInteger(portNum) && portNum > 0 && portNum <= 65535;
  const isValidState = typeof stateParam === 'string' && stateParam.trim().length > 0;

  if (!isValidPort || !isValidState) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-surface-container-lowest border border-error/30 rounded-2xl p-6 shadow-xs">
          <div className="text-3xl mb-3">⚠️</div>
          <h1 className="font-headline text-lg font-bold text-error mb-2">
            Parámetros de autenticación inválidos o faltantes
          </h1>
          <p className="font-body text-xs text-on-surface-variant mb-6 leading-relaxed">
            Esta página está diseñada para ser abierta automáticamente desde el comando{' '}
            <code className="bg-surface-container px-1.5 py-0.5 rounded text-xs text-primary font-mono">cloudcode login</code>{' '}
            o el TUI. No se recibieron los parámetros <code className="font-mono text-xs text-on-surface">port</code> o{' '}
            <code className="font-mono text-xs text-on-surface">state</code> requeridos para completar el inicio de sesión.
          </p>
          <Link
            href="/admin"
            className="inline-block text-xs text-primary hover:underline font-medium"
          >
            ← Volver al Panel de Administración
          </Link>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const { rawToken } = await createAccessToken(session.user.id, {
    label: `CLI login ${today}`,
    scopes: ['read', 'write'],
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-6 shadow-xs">
        <div className="border-b border-surface-container-highest pb-4 mb-6 text-center">
          <div className="text-2xl mb-1">☁️</div>
          <h1 className="font-headline text-xl font-bold text-on-surface">
            CloudCode Skills Registry
          </h1>
          <p className="font-body text-xs text-on-surface-variant mt-1">
            Autorizando sesión CLI para <span className="font-semibold text-on-surface">{session.user.name || session.user.email || 'Usuario'}</span>
          </p>
        </div>

        <CliAuthCallback port={portNum} state={stateParam} rawToken={rawToken} />

        <div className="mt-6 pt-4 border-t border-surface-container-highest text-center">
          <Link href="/admin" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
            Ir al Panel de Administración
          </Link>
        </div>
      </div>
    </div>
  );
}
