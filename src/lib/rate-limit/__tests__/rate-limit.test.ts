import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  checkRateLimit,
  rateLimitGuard,
  purgeExpiredRateLimits,
  getClientIp,
} from '@/lib/rate-limit';

describe('Rate Limiting (Postgres sliding window)', () => {
  const TEST_IP_1 = '192.168.1.101';
  const TEST_IP_2 = '192.168.1.102';
  const TEST_ENDPOINT = 'test_endpoint';

  beforeEach(async () => {
    // Clean test records before each test
    await prisma.rateLimitHit.deleteMany({
      where: {
        ip: { in: [TEST_IP_1, TEST_IP_2, '127.0.0.1', '10.0.0.1'] },
      },
    });
  });

  afterAll(async () => {
    // Clean all test records after test suite completes
    await prisma.rateLimitHit.deleteMany({
      where: {
        ip: { in: [TEST_IP_1, TEST_IP_2, '127.0.0.1', '10.0.0.1'] },
      },
    });
  });

  describe('getClientIp', () => {
    it('extracts IP from x-forwarded-for header (first IP in list)', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '203.0.113.195, 70.41.3.18, 150.172.238.178');
      const req = new Request('http://localhost:3000', { headers });
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('extracts IP from x-real-ip header if x-forwarded-for is missing', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '198.51.100.42');
      const req = new Request('http://localhost:3000', { headers });
      expect(getClientIp(req)).toBe('198.51.100.42');
    });

    it('extracts IP from cf-connecting-ip header if other headers are missing', () => {
      const headers = new Headers();
      headers.set('cf-connecting-ip', '198.51.100.99');
      const req = new Request('http://localhost:3000', { headers });
      expect(getClientIp(req)).toBe('198.51.100.99');
    });

    it('falls back to 127.0.0.1 when no IP headers are present', () => {
      const req = new Request('http://localhost:3000');
      expect(getClientIp(req)).toBe('127.0.0.1');
    });
  });

  describe('checkRateLimit', () => {
    it('allows requests within limit and records hits in Postgres', async () => {
      const res1 = await checkRateLimit(TEST_IP_1, TEST_ENDPOINT, { limit: 3, windowMs: 60_000 });
      expect(res1.allowed).toBe(true);
      expect(res1.count).toBe(1);
      expect(res1.remaining).toBe(2);

      const res2 = await checkRateLimit(TEST_IP_1, TEST_ENDPOINT, { limit: 3, windowMs: 60_000 });
      expect(res2.allowed).toBe(true);
      expect(res2.count).toBe(2);
      expect(res2.remaining).toBe(1);

      const res3 = await checkRateLimit(TEST_IP_1, TEST_ENDPOINT, { limit: 3, windowMs: 60_000 });
      expect(res3.allowed).toBe(true);
      expect(res3.count).toBe(3);
      expect(res3.remaining).toBe(0);

      const hitsInDb = await prisma.rateLimitHit.count({
        where: { ip: TEST_IP_1, endpoint: TEST_ENDPOINT },
      });
      expect(hitsInDb).toBe(3);
    });

    it('blocks requests exceeding limit with allowed=false and remaining=0', async () => {
      // Consume limit
      await checkRateLimit(TEST_IP_1, TEST_ENDPOINT, { limit: 2, windowMs: 60_000 });
      await checkRateLimit(TEST_IP_1, TEST_ENDPOINT, { limit: 2, windowMs: 60_000 });

      // 3rd request exceeds limit
      const blockedRes = await checkRateLimit(TEST_IP_1, TEST_ENDPOINT, { limit: 2, windowMs: 60_000 });
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.success).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.count).toBe(2);

      // Hit count in DB should still be 2 (blocked requests do not insert new hits)
      const hitsInDb = await prisma.rateLimitHit.count({
        where: { ip: TEST_IP_1, endpoint: TEST_ENDPOINT },
      });
      expect(hitsInDb).toBe(2);
    });

    it('tracks rate limits independently across different IPs and endpoints', async () => {
      await checkRateLimit(TEST_IP_1, 'endpoint_A', { limit: 1, windowMs: 60_000 });
      
      // TEST_IP_1 on endpoint_A is exhausted
      const ip1ResA = await checkRateLimit(TEST_IP_1, 'endpoint_A', { limit: 1, windowMs: 60_000 });
      expect(ip1ResA.allowed).toBe(false);

      // TEST_IP_1 on endpoint_B is allowed
      const ip1ResB = await checkRateLimit(TEST_IP_1, 'endpoint_B', { limit: 1, windowMs: 60_000 });
      expect(ip1ResB.allowed).toBe(true);

      // TEST_IP_2 on endpoint_A is allowed
      const ip2ResA = await checkRateLimit(TEST_IP_2, 'endpoint_A', { limit: 1, windowMs: 60_000 });
      expect(ip2ResA.allowed).toBe(true);
    });

    it('respects sliding window by ignoring hits outside the window', async () => {
      // Insert old hit beyond 10 seconds ago
      const oldDate = new Date(Date.now() - 15_000);
      await prisma.rateLimitHit.create({
        data: {
          ip: TEST_IP_1,
          endpoint: TEST_ENDPOINT,
          createdAt: oldDate,
        },
      });

      // Window is 10 seconds, limit is 1
      const res = await checkRateLimit(TEST_IP_1, TEST_ENDPOINT, { limit: 1, windowMs: 10_000 });
      expect(res.allowed).toBe(true);
      expect(res.count).toBe(1);
    });
  });

  describe('rateLimitGuard', () => {
    it('returns null when request is within rate limit', async () => {
      const req = new Request('http://localhost:3000/api/skills/test', {
        headers: { 'x-forwarded-for': TEST_IP_1 },
      });
      const guardRes = await rateLimitGuard(req, 'skills_route', { limit: 5 });
      expect(guardRes).toBeNull();
    });

    it('returns 429 response with headers when rate limit is exceeded', async () => {
      const req = new Request('http://localhost:3000/api/skills/test', {
        headers: { 'x-forwarded-for': TEST_IP_1 },
      });

      // Exhaust limit
      await rateLimitGuard(req, 'skills_route', { limit: 1 });

      // Second attempt blocked
      const blockedRes = await rateLimitGuard(req, 'skills_route', { limit: 1 });
      expect(blockedRes).not.toBeNull();
      expect(blockedRes?.status).toBe(429);
      expect(blockedRes?.headers.get('Retry-After')).toBeDefined();
      expect(blockedRes?.headers.get('X-RateLimit-Remaining')).toBe('0');

      const body = await blockedRes?.json();
      expect(body.error).toBe('Too Many Requests');
    });
  });

  describe('purgeExpiredRateLimits', () => {
    it('purges only hits older than maxAgeMs and preserves active hits', async () => {
      const now = Date.now();
      const oldDate = new Date(now - 120_000); // 2 minutes ago
      const freshDate = new Date(now - 10_000); // 10 seconds ago

      await prisma.rateLimitHit.createMany({
        data: [
          { ip: TEST_IP_1, endpoint: TEST_ENDPOINT, createdAt: oldDate },
          { ip: TEST_IP_1, endpoint: TEST_ENDPOINT, createdAt: oldDate },
          { ip: TEST_IP_1, endpoint: TEST_ENDPOINT, createdAt: freshDate },
        ],
      });

      // Purge older than 60 seconds (1 minute)
      const purgeResult = await purgeExpiredRateLimits(60_000);
      expect(purgeResult.deletedCount).toBe(2);

      const remainingHits = await prisma.rateLimitHit.findMany({
        where: { ip: TEST_IP_1, endpoint: TEST_ENDPOINT },
      });
      expect(remainingHits.length).toBe(1);
    });
  });
});
