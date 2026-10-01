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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between border-b pb-6 mb-8 border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              ← Volver al Panel
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Ideas y Referencias de Contexto</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Administra tus notas privadas de producto y referencias a herramientas externas del ecosistema.
          </p>
        </div>
      </div>

      <ContextList initialContexts={contexts} />
    </div>
  );
}
