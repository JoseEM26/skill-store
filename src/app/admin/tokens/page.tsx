import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserAccessTokens } from '@/lib/auth/tokens';
import { TokenList } from '@/components/admin/TokenList';

export default async function AdminTokensPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/admin/tokens');
    return null;
  }

  const tokens = await getUserAccessTokens(session.user.id);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between border-b pb-6 mb-8 border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              ← Volver al Panel
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tokens de Acceso al Servidor MCP
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestiona tus claves de acceso personal con permisos granulares (read, write, delete).
          </p>
        </div>
      </div>

      <TokenList initialTokens={tokens} />
    </div>
  );
}
