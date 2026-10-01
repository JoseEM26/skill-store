import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { POST, GET } from '../purge-rate-limits/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

describe('Maintenance Purge Rate Limits Route (/api/maintenance/purge-rate-limits)', () => {
  const TEST_IP = '192.168.100.200';

  beforeEach(async () => {
    await prisma.rateLimitHit.deleteMany({
      where: { ip: TEST_IP },
    });
  });

  afterAll(async () => {
    await prisma.rateLimitHit.deleteMany({
      where: { ip: TEST_IP },
    });
  });

  it('POST /api/maintenance/purge-rate-limits deletes old records and returns count', async () => {
    const now = Date.now();
    const oldDate = new Date(now - 100_000); // 100s ago
    const freshDate = new Date(now - 5_000);  // 5s ago

    await prisma.rateLimitHit.createMany({
      data: [
        { ip: TEST_IP, endpoint: 'test_ep', createdAt: oldDate },
        { ip: TEST_IP, endpoint: 'test_ep', createdAt: oldDate },
        { ip: TEST_IP, endpoint: 'test_ep', createdAt: freshDate },
      ],
    });

    const req = new NextRequest('http://localhost:3000/api/maintenance/purge-rate-limits', {
      method: 'POST',
      body: JSON.stringify({ maxAgeMs: 50_000 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.purgedCount).toBe(2);

    const remaining = await prisma.rateLimitHit.findMany({
      where: { ip: TEST_IP },
    });
    expect(remaining.length).toBe(1);
  });

  it('GET /api/maintenance/purge-rate-limits triggers purge using query param maxAgeMs', async () => {
    const now = Date.now();
    const oldDate = new Date(now - 120_000);

    await prisma.rateLimitHit.create({
      data: { ip: TEST_IP, endpoint: 'test_ep', createdAt: oldDate },
    });

    const req = new NextRequest('http://localhost:3000/api/maintenance/purge-rate-limits?maxAgeMs=60000');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.purgedCount).toBe(1);
  });
});
