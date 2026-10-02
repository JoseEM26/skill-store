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
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <SkillDetail skill={skill} />
    </main>
  );
}

