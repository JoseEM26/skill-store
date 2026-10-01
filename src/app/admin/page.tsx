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
      <div className="flex items-center justify-between border-b pb-6 mb-8 border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Panel de Administración</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestiona tus skills, contextos y tokens de acceso
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
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
              className="text-sm px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium cursor-pointer"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6 mb-8 border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Perfil de Usuario Autenticado</h2>
        <div className="flex items-center space-x-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.username || 'Avatar'} className="w-16 h-16 rounded-full border border-gray-200 dark:border-gray-700" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl font-bold">
              {(user.username || user.name || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{user.name || user.username || 'Usuario'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username || 'sin-username'}</p>
            <p className="text-xs text-gray-400 mt-1">ID Interno: {user.id}</p>
            {user.githubId && <p className="text-xs text-gray-400">GitHub ID: {user.githubId}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-gray-900 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Ideas y Contextos</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Crea y administra tus notas de producto privadas y referencias a herramientas externas.
            </p>
          </div>
          <Link
            href="/admin/contexts"
            className="inline-block text-center text-sm font-medium px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Gestionar Contextos →
          </Link>
        </div>

        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-gray-900 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Mis Skills</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Registra nuevas skills propias, administra versiones y enlaces de repositorio.
            </p>
          </div>
          <Link
            href="/admin/skills"
            className="inline-block text-center text-sm font-medium px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Gestionar Skills →
          </Link>
        </div>

        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-gray-900 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tokens de Acceso MCP</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Emite y revoca tokens de acceso personal con permisos granulares (read, write, delete).
            </p>
          </div>
          <Link
            href="/admin/tokens"
            className="inline-block text-center text-sm font-medium px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Gestionar Tokens →
          </Link>
        </div>
      </div>
    </div>
  );
}
