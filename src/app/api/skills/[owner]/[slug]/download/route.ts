import { NextResponse } from 'next/server';
import { incrementDownloadsCount } from '@/lib/catalog/counters';
import { rateLimitGuard } from '@/lib/rate-limit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string; slug: string }> }
) {
  const rateLimitRes = await rateLimitGuard(request, 'api_skills_download');
  if (rateLimitRes) return rateLimitRes;

  const { owner, slug } = await params;

  if (!owner || !slug) {
    return NextResponse.json(
      { error: 'Owner y slug son requeridos' },
      { status: 400 }
    );
  }

  const result = await incrementDownloadsCount(owner, slug);

  if (!result) {
    return NextResponse.json(
      { error: `Skill '${owner}/${slug}' no encontrada o archivada` },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      downloadsCount: result.downloadsCount,
      installsCount: result.installsCount,
    },
    { status: 200 }
  );
}
