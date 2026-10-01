import { notFound } from 'next/navigation';
import { getSkillByOwnerAndSlug } from '@/lib/catalog/queries';
import { SkillDetail } from '@/components/catalog/SkillDetail';

interface PageProps {
  params: Promise<{
    owner: string;
    slug: string;
  }>;
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { owner, slug } = await params;

  const skill = await getSkillByOwnerAndSlug(owner, slug);

  if (!skill) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <SkillDetail skill={skill} />
    </main>
  );
}
