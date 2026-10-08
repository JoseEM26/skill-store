import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/admin');
    return null;
  }

  const user = session.user as {
    id?: string;
    name?: string | null;
    username?: string | null;
    githubId?: string | null;
    image?: string | null;
    email?: string | null;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between border-b pb-6 mb-8 border-surface-container-highest">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Panel de Administración</h1>
          <p className="font-body text-sm text-on-surface-variant">
            Gestiona tus skills, contextos y tokens de acceso
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm px-3 py-1.5 rounded-lg border border-surface-container-highest bg-surface-container-lowest hover:bg-surface-container text-on-surface transition-colors"
          >
            Ver Catálogo
          </Link>
          <form
            action={async () => {
              'use server';
              const { signOut } = await import('@/auth');
              await signOut({ redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="text-sm px-3.5 py-1.5 rounded-lg bg-error hover:bg-error-dim text-on-error font-medium cursor-pointer transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <div className="bg-surface-container-lowest shadow-xs rounded-xl p-6 mb-8 border border-surface-container-highest">
        <h2 className="font-headline text-lg font-semibold text-on-surface mb-4">Perfil de Usuario Autenticado</h2>
        <div className="flex items-center space-x-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.username || 'Avatar'} className="w-16 h-16 rounded-full border border-surface-container-highest" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-xl font-bold text-on-surface">
              {(user.username || user.name || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-headline text-lg font-bold text-on-surface">{user.name || user.username || 'Usuario'}</p>
            <p className="font-body text-sm text-on-surface-variant">@{user.username || 'sin-username'}</p>
            <p className="font-mono text-xs text-outline mt-1">ID Interno: {user.id}</p>
            {user.githubId && <p className="font-mono text-xs text-outline">GitHub ID: {user.githubId}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="border border-surface-container-highest rounded-xl p-6 bg-surface-container-lowest shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-headline font-semibold text-on-surface mb-2">Ideas y Contextos</h3>
            <p className="font-body text-sm text-on-surface-variant mb-4">
              Crea y administra tus notas de producto privadas y referencias a herramientas externas.
            </p>
          </div>
          <Link
            href="/admin/contexts"
            className="inline-block text-center text-sm font-medium px-4 py-2 bg-primary hover:bg-primary-dim text-on-primary rounded-lg transition-colors"
          >
            Gestionar Contextos →
          </Link>
        </div>

        <div className="border border-surface-container-highest rounded-xl p-6 bg-surface-container-lowest shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-headline font-semibold text-on-surface mb-2">Mis Skills</h3>
            <p className="font-body text-sm text-on-surface-variant mb-4">
              Registra nuevas skills propias, administra versiones y enlaces de repositorio.
            </p>
          </div>
          <Link
            href="/admin/skills"
            className="inline-block text-center text-sm font-medium px-4 py-2 bg-primary hover:bg-primary-dim text-on-primary rounded-lg transition-colors"
          >
            Gestionar Skills →
          </Link>
        </div>

        <div className="border border-surface-container-highest rounded-xl p-6 bg-surface-container-lowest shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-headline font-semibold text-on-surface mb-2">Grupos de Skills</h3>
            <p className="font-body text-sm text-on-surface-variant mb-4">
              Crea y administra colecciones de tus skills propias para descargarlas en lote.
            </p>
          </div>
          <Link
            href="/admin/groups"
            className="inline-block text-center text-sm font-medium px-4 py-2 bg-primary hover:bg-primary-dim text-on-primary rounded-lg transition-colors"
          >
            Gestionar Grupos →
          </Link>
        </div>

        <div className="border border-surface-container-highest rounded-xl p-6 bg-surface-container-lowest shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-headline font-semibold text-on-surface mb-2">Tokens de Acceso MCP</h3>
            <p className="font-body text-sm text-on-surface-variant mb-4">
              Emite y revoca tokens de acceso personal con permisos granulares (read, write, delete).
            </p>
          </div>
          <Link
            href="/admin/tokens"
            className="inline-block text-center text-sm font-medium px-4 py-2 bg-primary hover:bg-primary-dim text-on-primary rounded-lg transition-colors"
          >
            Gestionar Tokens →
          </Link>
        </div>
      </div>
    </div>
  );
}
