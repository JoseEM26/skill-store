import { NextResponse } from 'next/server';
import { getSkillByOwnerAndSlug } from '@/lib/catalog/queries';
import { rateLimitGuard } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; slug: string }> }
) {
  const rateLimitRes = await rateLimitGuard(request, 'api_skills_detail');
  if (rateLimitRes) return rateLimitRes;

  const { owner, slug } = await params;

  if (!owner || !slug) {
    return NextResponse.json(
      { error: 'Owner y slug son requeridos' },
      { status: 400 }
    );
  }

  const skill = await getSkillByOwnerAndSlug(owner, slug);

  if (!skill) {
    return NextResponse.json(
      { error: `Skill '${owner}/${slug}' no encontrada o archivada` },
      { status: 404 }
    );
  }

  return NextResponse.json(skill, { status: 200 });
}
