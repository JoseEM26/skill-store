import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserContexts } from '@/lib/admin/contexts';
import { ContextList } from '@/components/admin/ContextList';

export default async function AdminContextsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/admin/contexts');
    return null;
  }

  const contexts = await getUserContexts(session.user.id);

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-6">
      {/* Top Header & Call-to-actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-container-highest">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/admin"
              className="text-xs font-label text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
            >
              <span>← Volver al Panel</span>
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
              Mis Ideas y Referencias de Contexto
            </h1>
            <span className="font-mono text-xs text-primary bg-secondary-fixed px-2 py-0.5 rounded font-semibold border border-secondary-fixed-dim">
              {contexts.length} {contexts.length === 1 ? 'activo' : 'activos'}
            </span>
          </div>
          <p className="font-body text-xs sm:text-sm text-on-surface-variant mt-1">
            Administra tus notas privadas de producto y referencias a herramientas externas del ecosistema.
          </p>
        </div>
      </div>

      <ContextList initialContexts={contexts} />

      {/* Quick Integration Callout Banner */}
      <div className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary-fixed text-primary flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold text-on-surface font-headline">
              Usa tus contextos directamente en tu terminal
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Puedes inyectar cualquier contexto en Claude Code ejecutando el comando de contexto activo.
            </p>
          </div>
        </div>
        <div className="w-full md:w-auto bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-1.5 flex items-center justify-between gap-3 font-mono text-xs text-on-surface">
          <code>claude context add @Aybar-Corp/tailwind-design-system</code>
        </div>
      </div>
    </main>
  );
}

