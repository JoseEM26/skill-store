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
      <div className="flex items-center justify-between border-b pb-6 mb-8 border-surface-container-highest">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-xs text-primary hover:underline">
              ← Volver al Panel
            </Link>
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            Tokens de Acceso al Servidor MCP
          </h1>
          <p className="font-body text-sm text-on-surface-variant">
            Gestiona tus claves de acceso personal con permisos granulares (read, write, delete).
          </p>
        </div>
      </div>

      <TokenList initialTokens={tokens} />
    </div>
  );
}
