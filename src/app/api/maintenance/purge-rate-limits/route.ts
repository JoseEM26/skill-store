import { NextRequest, NextResponse } from 'next/server';
import { purgeExpiredRateLimits } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let maxAgeMs = 60_000;
    try {
      const body = await req.json();
      if (typeof body?.maxAgeMs === 'number' && body.maxAgeMs > 0) {
        maxAgeMs = body.maxAgeMs;
      }
    } catch {
      // Body is optional; fallback to default maxAgeMs
    }

    const { deletedCount } = await purgeExpiredRateLimits(maxAgeMs);

    return NextResponse.json(
      {
        success: true,
        purgedCount: deletedCount,
        maxAgeMs,
        purgedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error durante la purga de rate limits',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl?.searchParams;
  const maxAgeParam = searchParams?.get('maxAgeMs');
  const parsedMaxAge = maxAgeParam ? parseInt(maxAgeParam, 10) : 60_000;
  const maxAgeMs = isNaN(parsedMaxAge) ? 60_000 : parsedMaxAge;

  try {
    const { deletedCount } = await purgeExpiredRateLimits(maxAgeMs);
    return NextResponse.json(
      {
        success: true,
        purgedCount: deletedCount,
        maxAgeMs,
        purgedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error durante la purga de rate limits',
      },
      { status: 500 }
    );
  }
}
