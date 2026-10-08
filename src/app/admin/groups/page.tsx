import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserGroups, getUserGroupById } from '@/lib/admin/groups';
import { getUserSkills } from '@/lib/admin/skills';
import { getPublicCatalog, type CatalogSkillItem } from '@/lib/catalog/queries';
import { GroupList } from '@/components/admin/GroupList';

export default async function AdminGroupsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/admin/groups');
    return null;
  }

  const userId = session.user.id;

  const [groupsWithCount, ownSkills, publicCatalog] = await Promise.all([
    getUserGroups(userId),
    getUserSkills(userId),
    getPublicCatalog({ type: 'skills' }),
  ]);

  const fullGroups = await Promise.all(
    groupsWithCount.map(async (g) => {
      const full = await getUserGroupById(userId, g.id);
      return full || { ...g, items: [] };
    })
  );

  const ownSkillIds = new Set(ownSkills.map((s) => s.id));
  const publicSkills = (publicCatalog.items || []).filter(
    (item): item is CatalogSkillItem => item.kind === 'skill'
  );
  const otherPublicSkills = publicSkills.filter((s) => !ownSkillIds.has(s.id));

  const availableSkills = [...ownSkills, ...otherPublicSkills];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between border-b pb-6 mb-8 border-surface-container-highest">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-xs text-primary hover:underline">
              ← Volver al Panel
            </Link>
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Mis Grupos de Skills</h1>
          <p className="font-body text-sm text-on-surface-variant">
            Crea y administra colecciones de skills para descargarlas en lote vía CLI.
          </p>
        </div>
      </div>

      <GroupList initialGroups={fullGroups} userSkills={availableSkills} />
    </div>
  );
}
