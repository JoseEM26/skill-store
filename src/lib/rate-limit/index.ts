import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface RateLimitOptions {
  limit?: number;
  maxRequests?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  success: boolean;
  count: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Extracts client IP address from request headers with fallback to 127.0.0.1.
 */
export function getClientIp(request: Request | Headers | { headers: Headers }): string {
  const headers = 'headers' in request ? request.headers : request;
  
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0].trim();
    if (ip) return ip;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) {
    return cfIp.trim();
  }

  return '127.0.0.1';
}

/**
 * Checks sliding window rate limit for given IP and endpoint in Postgres.
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const limit = options.limit ?? options.maxRequests ?? 60;
  const windowMs = options.windowMs ?? 60_000;
  const now = Date.now();
  const windowStart = new Date(now - windowMs);
  const resetAt = new Date(now + windowMs);

  const count = await prisma.rateLimitHit.count({
    where: {
      ip,
      endpoint,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (count >= limit) {
    return {
      allowed: false,
      success: false,
      count,
      limit,
      remaining: 0,
      resetAt,
    };
  }

  await prisma.rateLimitHit.create({
    data: {
      ip,
      endpoint,
    },
  });

  const currentCount = count + 1;
  return {
    allowed: true,
    success: true,
    count: currentCount,
    limit,
    remaining: Math.max(0, limit - currentCount),
    resetAt,
  };
}

/**
 * Rate limiting guard for route handlers. Returns NextResponse with status 429 if limit exceeded, or null if allowed.
 */
export async function rateLimitGuard(
  request: Request,
  endpoint: string,
  options?: RateLimitOptions
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, endpoint, options);

  if (!result.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Demasiadas solicitudes. Por favor intente más tarde.',
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Purges expired rate limit hit records older than maxAgeMs from Postgres.
 */
export async function purgeExpiredRateLimits(
  maxAgeMs: number = 60_000
): Promise<{ deletedCount: number }> {
  const cutoffDate = new Date(Date.now() - maxAgeMs);
  const result = await prisma.rateLimitHit.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });
  return { deletedCount: result.count };
}

export const purgeOldRateLimits = purgeExpiredRateLimits;
