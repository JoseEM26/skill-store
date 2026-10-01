import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserSkills } from '@/lib/admin/skills';
import { SkillList } from '@/components/admin/SkillList';

export default async function AdminSkillsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/admin/skills');
    return null;
  }

  const username =
    (session.user as { username?: string }).username || session.user.name || 'usuario';
  const skills = await getUserSkills(session.user.id);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between border-b pb-6 mb-8 border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              ← Volver al Panel
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Skills Publicadas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Administra tus skills, versiones y repositorios asociados a tu cuenta de autor.
          </p>
        </div>
      </div>

      <SkillList initialSkills={skills} username={username} />
    </div>
  );
}
