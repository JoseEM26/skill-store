import { NextResponse } from 'next/server';
import { getSkillByOwnerAndSlug } from '@/lib/catalog/queries';
import { rateLimitGuard } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; slug: string; version: string }> }
) {
  const rateLimitRes = await rateLimitGuard(request, 'api_skills_version_detail');
  if (rateLimitRes) return rateLimitRes;

  const { owner, slug, version } = await params;

  if (!owner || !slug || !version) {
    return NextResponse.json(
      { error: 'Owner, slug y versión son requeridos' },
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

  const foundVersion = skill.versions.find((v) => v.version === version);

  if (!foundVersion) {
    return NextResponse.json(
      { error: `Versión '${version}' de la skill '${owner}/${slug}' no encontrada` },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      skill: {
        owner,
        slug,
        name: skill.name,
      },
      version: foundVersion.version,
      changelog: foundVersion.changelog,
      gitTag: foundVersion.gitTag,
      publishedAt: foundVersion.publishedAt,
    },
    { status: 200 }
  );
}
