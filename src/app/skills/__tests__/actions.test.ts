import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { incrementDownloadAction, incrementInstallAction } from '../actions';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Public Skills Server Actions', () => {
  const testOwner = 'actions-counter-user';
  let ownerId = '';
  const skillSlug = 'action-skill-counter';

  beforeAll(async () => {
    const existing = await prisma.user.findFirst({
      where: { username: testOwner },
    });
    if (existing) {
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const user = await prisma.user.create({
      data: {
        githubId: 'gh_actions_counter_user',
        username: testOwner,
      },
    });
    ownerId = user.id;

    await prisma.skill.create({
      data: {
        slug: skillSlug,
        name: 'Action Skill Counter',
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

  it('increments download count via Server Action and returns success', async () => {
    const res = await incrementDownloadAction(testOwner, skillSlug);
    expect(res.success).toBe(true);
    expect(res.downloadsCount).toBe(1);

    const inDb = await prisma.skill.findFirst({
      where: { slug: skillSlug, ownerId },
    });
    expect(inDb?.downloadsCount).toBe(1);
  });

  it('increments install count via Server Action and returns success', async () => {
    const res = await incrementInstallAction(testOwner, skillSlug);
    expect(res.success).toBe(true);
    expect(res.installsCount).toBe(1);

    const inDb = await prisma.skill.findFirst({
      where: { slug: skillSlug, ownerId },
    });
    expect(inDb?.installsCount).toBe(1);
  });

  it('returns error when skill does not exist', async () => {
    const res = await incrementDownloadAction(testOwner, 'nonexistent');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
