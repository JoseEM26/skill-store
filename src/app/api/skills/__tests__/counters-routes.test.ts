import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as downloadHandler } from '../[owner]/[slug]/download/route';
import { POST as installHandler } from '../[owner]/[slug]/install/route';
import { prisma } from '@/lib/prisma';

describe('Popularity Counters REST Endpoints', () => {
  const testOwner = 'route-counter-user';
  let ownerId = '';
  const skillSlug = 'route-test-skill';

  beforeAll(async () => {
    // Cleanup any existing user
    const existing = await prisma.user.findFirst({
      where: { username: testOwner },
    });
    if (existing) {
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const user = await prisma.user.create({
      data: {
        githubId: 'gh_route_counter_user',
        username: testOwner,
      },
    });
    ownerId = user.id;

    await prisma.skill.create({
      data: {
        slug: skillSlug,
        name: 'Route Test Skill',
        ownerId: user.id,
        downloadsCount: 0,
        installsCount: 0,
        isArchived: false,
      },
    });
  });

  afterAll(async () => {
    if (ownerId) {
      await prisma.user.delete({ where: { id: ownerId } }).catch(() => {});
    }
  });

  describe('POST /api/skills/[owner]/[slug]/download', () => {
    it('returns 200 and increments downloadsCount without authentication', async () => {
      const req = new Request(`http://localhost:3000/api/skills/${testOwner}/${skillSlug}/download`, {
        method: 'POST',
      });

      const res = await downloadHandler(req, {
        params: Promise.resolve({ owner: testOwner, slug: skillSlug }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.downloadsCount).toBe(1);

      // Call second time
      const res2 = await downloadHandler(req, {
        params: Promise.resolve({ owner: testOwner, slug: skillSlug }),
      });
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.downloadsCount).toBe(2);
    });

    it('returns 404 when skill or owner does not exist', async () => {
      const req = new Request('http://localhost:3000/api/skills/unknown-user/unknown-slug/download', {
        method: 'POST',
      });

      const res = await downloadHandler(req, {
        params: Promise.resolve({ owner: 'unknown-user', slug: 'unknown-slug' }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });
  });

  describe('POST /api/skills/[owner]/[slug]/install', () => {
    it('returns 200 and increments installsCount without authentication', async () => {
      const req = new Request(`http://localhost:3000/api/skills/${testOwner}/${skillSlug}/install`, {
        method: 'POST',
      });

      const res = await installHandler(req, {
        params: Promise.resolve({ owner: testOwner, slug: skillSlug }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.installsCount).toBe(1);

      // Call second time
      const res2 = await installHandler(req, {
        params: Promise.resolve({ owner: testOwner, slug: skillSlug }),
      });
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.installsCount).toBe(2);
    });

    it('returns 404 when skill or owner does not exist', async () => {
      const req = new Request('http://localhost:3000/api/skills/unknown-user/unknown-slug/install', {
        method: 'POST',
      });

      const res = await installHandler(req, {
        params: Promise.resolve({ owner: 'unknown-user', slug: 'unknown-slug' }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it('returns HTTP 429 Too Many Requests when IP rate limit is exceeded on install', async () => {
      const testIp = '172.16.0.46';

      // Insert hits up to default limit
      const hits = Array.from({ length: 60 }).map(() => ({
        ip: testIp,
        endpoint: 'api_skills_install',
      }));
      await prisma.rateLimitHit.createMany({ data: hits });

      const req = new Request(`http://localhost:3000/api/skills/${testOwner}/${skillSlug}/install`, {
        method: 'POST',
        headers: { 'x-forwarded-for': testIp },
      });

      const res = await installHandler(req, {
        params: Promise.resolve({ owner: testOwner, slug: skillSlug }),
      });

      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error).toBe('Too Many Requests');

      // Cleanup test data
      await prisma.rateLimitHit.deleteMany({ where: { ip: testIp } });
    });
  });
});

