import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../prisma';
import { incrementDownloadsCount, incrementInstallsCount } from '../counters';

describe('Popularity Counters Service', () => {
  const testOwnerUsername = 'counters-test-user';
  let ownerId = '';
  const activeSkillSlug = 'test-counter-skill';
  const archivedSkillSlug = 'archived-counter-skill';

  beforeAll(async () => {
    // Cleanup any leftovers first
    const existing = await prisma.user.findFirst({
      where: { username: testOwnerUsername },
    });
    if (existing) {
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const owner = await prisma.user.create({
      data: {
        githubId: 'gh_counters_test_user',
        username: testOwnerUsername,
        avatarUrl: 'https://github.com/counters-test-user.png',
      },
    });
    ownerId = owner.id;

    await prisma.skill.create({
      data: {
        slug: activeSkillSlug,
        name: 'Test Counter Skill',
        description: 'Testing popularity counter increments',
        ownerId: owner.id,
        downloadsCount: 0,
        installsCount: 0,
        isArchived: false,
      },
    });

    await prisma.skill.create({
      data: {
        slug: archivedSkillSlug,
        name: 'Archived Counter Skill',
        description: 'Archived skill should not increment',
        ownerId: owner.id,
        downloadsCount: 0,
        installsCount: 0,
        isArchived: true,
      },
    });
  });

  afterAll(async () => {
    if (ownerId) {
      await prisma.user.delete({ where: { id: ownerId } }).catch(() => {});
    }
  });

  describe('incrementDownloadsCount', () => {
    it('increments downloadsCount atomically by 1 and returns updated data', async () => {
      const res1 = await incrementDownloadsCount(testOwnerUsername, activeSkillSlug);
      expect(res1).not.toBeNull();
      expect(res1?.downloadsCount).toBe(1);

      const res2 = await incrementDownloadsCount(testOwnerUsername, activeSkillSlug);
      expect(res2).not.toBeNull();
      expect(res2?.downloadsCount).toBe(2);

      // Verify directly in DB
      const inDb = await prisma.skill.findFirst({
        where: { slug: activeSkillSlug, ownerId },
      });
      expect(inDb?.downloadsCount).toBe(2);
    });

    it('returns null for nonexistent skill or wrong owner', async () => {
      const resWrongOwner = await incrementDownloadsCount('wrong-owner', activeSkillSlug);
      expect(resWrongOwner).toBeNull();

      const resWrongSlug = await incrementDownloadsCount(testOwnerUsername, 'nonexistent-slug');
      expect(resWrongSlug).toBeNull();
    });

    it('returns null for archived skill', async () => {
      const resArchived = await incrementDownloadsCount(testOwnerUsername, archivedSkillSlug);
      expect(resArchived).toBeNull();
    });
  });

  describe('incrementInstallsCount', () => {
    it('increments installsCount atomically by 1 and returns updated data', async () => {
      const res1 = await incrementInstallsCount(testOwnerUsername, activeSkillSlug);
      expect(res1).not.toBeNull();
      expect(res1?.installsCount).toBe(1);

      const res2 = await incrementInstallsCount(testOwnerUsername, activeSkillSlug);
      expect(res2).not.toBeNull();
      expect(res2?.installsCount).toBe(2);

      // Verify directly in DB
      const inDb = await prisma.skill.findFirst({
        where: { slug: activeSkillSlug, ownerId },
      });
      expect(inDb?.installsCount).toBe(2);
    });

    it('returns null for nonexistent skill or wrong owner', async () => {
      const resWrongOwner = await incrementInstallsCount('wrong-owner', activeSkillSlug);
      expect(resWrongOwner).toBeNull();

      const resWrongSlug = await incrementInstallsCount(testOwnerUsername, 'nonexistent-slug');
      expect(resWrongSlug).toBeNull();
    });

    it('returns null for archived skill', async () => {
      const resArchived = await incrementInstallsCount(testOwnerUsername, archivedSkillSlug);
      expect(resArchived).toBeNull();
    });
  });
});
