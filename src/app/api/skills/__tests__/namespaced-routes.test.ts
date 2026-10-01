import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET as skillDetailHandler } from '../[owner]/[slug]/route';
import { GET as versionsListHandler } from '../[owner]/[slug]/versions/route';
import { GET as versionDetailHandler } from '../[owner]/[slug]/versions/[version]/route';
import { prisma } from '@/lib/prisma';

describe('Namespaced Skills REST Endpoints (/api/skills/[owner]/[slug])', () => {
  const usernameA = 'user-alpha-ns';
  const usernameB = 'user-beta-ns';
  let userAId = '';
  let userBId = '';
  const sharedSlug = 'shared-utility-skill';

  beforeAll(async () => {
    // Cleanup any existing test users
    await prisma.user.deleteMany({
      where: {
        username: { in: [usernameA, usernameB] },
      },
    });

    const userA = await prisma.user.create({
      data: {
        githubId: 'gh_user_alpha_ns',
        username: usernameA,
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        githubId: 'gh_user_beta_ns',
        username: usernameB,
      },
    });
    userBId = userB.id;

    // Create skill for userA with sharedSlug
    await prisma.skill.create({
      data: {
        slug: sharedSlug,
        name: 'Alpha Utility Skill',
        description: 'Utility by Alpha',
        ownerId: userA.id,
        license: 'MIT',
        versions: {
          create: [
            {
              version: '1.0.0',
              changelog: 'Alpha v1.0.0',
              gitTag: 'alpha-v1.0.0',
            },
            {
              version: '1.1.0',
              changelog: 'Alpha v1.1.0 update',
              gitTag: 'alpha-v1.1.0',
            },
          ],
        },
      },
    });

    // Create skill for userB with EXACT SAME sharedSlug (Coexistence test)
    await prisma.skill.create({
      data: {
        slug: sharedSlug,
        name: 'Beta Utility Skill',
        description: 'Utility by Beta',
        ownerId: userB.id,
        license: 'Apache-2.0',
        versions: {
          create: [
            {
              version: '2.0.0',
              changelog: 'Beta v2.0.0 initial',
              gitTag: 'beta-v2.0.0',
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    if (userAId || userBId) {
      await prisma.user.deleteMany({
        where: {
          id: { in: [userAId, userBId].filter(Boolean) },
        },
      });
    }
  });

  describe('GET /api/skills/[owner]/[slug]', () => {
    it('resolves skill for userA without colliding with userB with same slug', async () => {
      const reqA = new Request(`http://localhost:3000/api/skills/${usernameA}/${sharedSlug}`);
      const resA = await skillDetailHandler(reqA, {
        params: Promise.resolve({ owner: usernameA, slug: sharedSlug }),
      });

      expect(resA.status).toBe(200);
      const jsonA = await resA.json();
      expect(jsonA.name).toBe('Alpha Utility Skill');
      expect(jsonA.owner.username).toBe(usernameA);
      expect(jsonA.slug).toBe(sharedSlug);
      expect(jsonA.license).toBe('MIT');
      expect(jsonA.latestVersion.version).toBe('1.1.0');
    });

    it('resolves skill for userB without colliding with userA with same slug', async () => {
      const reqB = new Request(`http://localhost:3000/api/skills/${usernameB}/${sharedSlug}`);
      const resB = await skillDetailHandler(reqB, {
        params: Promise.resolve({ owner: usernameB, slug: sharedSlug }),
      });

      expect(resB.status).toBe(200);
      const jsonB = await resB.json();
      expect(jsonB.name).toBe('Beta Utility Skill');
      expect(jsonB.owner.username).toBe(usernameB);
      expect(jsonB.slug).toBe(sharedSlug);
      expect(jsonB.license).toBe('Apache-2.0');
      expect(jsonB.latestVersion.version).toBe('2.0.0');
    });

    it('returns 404 when querying an owner that does not exist for the slug', async () => {
      const req = new Request(`http://localhost:3000/api/skills/nonexistent-owner/${sharedSlug}`);
      const res = await skillDetailHandler(req, {
        params: Promise.resolve({ owner: 'nonexistent-owner', slug: sharedSlug }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it('returns 404 when querying a slug that does not exist for the owner', async () => {
      const req = new Request(`http://localhost:3000/api/skills/${usernameA}/nonexistent-slug`);
      const res = await skillDetailHandler(req, {
        params: Promise.resolve({ owner: usernameA, slug: 'nonexistent-slug' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/skills/[owner]/[slug]/versions', () => {
    it('returns all versions for the specified owner and slug', async () => {
      const req = new Request(`http://localhost:3000/api/skills/${usernameA}/${sharedSlug}/versions`);
      const res = await versionsListHandler(req, {
        params: Promise.resolve({ owner: usernameA, slug: sharedSlug }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.owner).toBe(usernameA);
      expect(json.slug).toBe(sharedSlug);
      expect(json.versions.length).toBe(2);
      expect(json.versions[0].version).toBe('1.1.0');
      expect(json.versions[1].version).toBe('1.0.0');
    });

    it('returns 404 for unknown owner or slug', async () => {
      const req = new Request(`http://localhost:3000/api/skills/fake-owner/${sharedSlug}/versions`);
      const res = await versionsListHandler(req, {
        params: Promise.resolve({ owner: 'fake-owner', slug: sharedSlug }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/skills/[owner]/[slug]/versions/[version]', () => {
    it('returns specific version detail and changelog for owner and slug', async () => {
      const req = new Request(`http://localhost:3000/api/skills/${usernameA}/${sharedSlug}/versions/1.0.0`);
      const res = await versionDetailHandler(req, {
        params: Promise.resolve({ owner: usernameA, slug: sharedSlug, version: '1.0.0' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.version).toBe('1.0.0');
      expect(json.changelog).toBe('Alpha v1.0.0');
      expect(json.gitTag).toBe('alpha-v1.0.0');
      expect(json.skill.owner).toBe(usernameA);
      expect(json.skill.slug).toBe(sharedSlug);
    });

    it('returns 404 when requested version does not exist on that skill', async () => {
      const req = new Request(`http://localhost:3000/api/skills/${usernameA}/${sharedSlug}/versions/9.9.9`);
      const res = await versionDetailHandler(req, {
        params: Promise.resolve({ owner: usernameA, slug: sharedSlug, version: '9.9.9' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('Rate Limiting on Skills Endpoints', () => {
    it('returns HTTP 429 Too Many Requests when IP rate limit is exceeded', async () => {
      const testIp = '172.16.0.45';

      // Insert hits up to default limit (60)
      const hits = Array.from({ length: 60 }).map(() => ({
        ip: testIp,
        endpoint: 'api_skills_detail',
      }));
      await prisma.rateLimitHit.createMany({ data: hits });

      const req = new Request(`http://localhost:3000/api/skills/${usernameA}/${sharedSlug}`, {
        headers: { 'x-forwarded-for': testIp },
      });

      const res = await skillDetailHandler(req, {
        params: Promise.resolve({ owner: usernameA, slug: sharedSlug }),
      });

      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error).toBe('Too Many Requests');

      // Cleanup test data
      await prisma.rateLimitHit.deleteMany({ where: { ip: testIp } });
    });
  });
});

