import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createIdeaAction,
  updateIdeaAction,
  createExternalReferenceAction,
  deleteContextAction,
  createSkillAction,
  updateSkillAction,
  deleteSkillAction,
  createAccessTokenAction,
  revokeAccessTokenAction,
} from '../actions';
import { hashToken } from '@/lib/auth/tokens';
import type { Session } from 'next-auth';

const mockAuth = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

describe('Admin Server Actions (Security & Authorization)', () => {
  let userA: { id: string; githubId: string };
  let userB: { id: string; githubId: string };

  beforeEach(async () => {
    vi.clearAllMocks();

    userA = await prisma.user.create({
      data: {
        githubId: `test-act-user-a-${Date.now()}`,
        username: 'userA_actions',
      },
    });

    userB = await prisma.user.create({
      data: {
        githubId: `test-act-user-b-${Date.now()}`,
        username: 'userB_actions',
      },
    });
  });

  afterEach(async () => {
    if (userA?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: userA.id } });
      await prisma.context.deleteMany({ where: { ownerId: userA.id } });
      await prisma.skill.deleteMany({ where: { ownerId: userA.id } });
      await prisma.user.deleteMany({ where: { id: userA.id } });
    }
    if (userB?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: userB.id } });
      await prisma.context.deleteMany({ where: { ownerId: userB.id } });
      await prisma.skill.deleteMany({ where: { ownerId: userB.id } });
      await prisma.user.deleteMany({ where: { id: userB.id } });
    }
  });

  it('rejects all actions when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const resIdea = await createIdeaAction({ title: 'Test Idea' });
    expect(resIdea.success).toBe(false);
    expect(resIdea.error).toContain('Debes iniciar sesión');

    const resSkill = await createSkillAction({ slug: 'test-skill', name: 'Test' });
    expect(resSkill.success).toBe(false);
    expect(resSkill.error).toContain('Debes iniciar sesión');
  });

  it('creates idea with isPublic = false when authenticated as user A', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const res = await createIdeaAction({
      title: 'Idea de A',
      body: 'Detalle de la idea',
      tags: 'ai, agents',
    });

    expect(res.success).toBe(true);
    const idea = res.data as { id: string; isPublic: boolean; ownerId: string };
    expect(idea.isPublic).toBe(false);
    expect(idea.ownerId).toBe(userA.id);
  });

  it('creates external reference with isPublic = true when authenticated as user A', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const res = await createExternalReferenceAction({
      title: 'Herdr Tool',
      link: 'https://github.com/herdr/herdr',
      tags: ['tool'],
      isPublic: true,
    });

    expect(res.success).toBe(true);
    const ref = res.data as { id: string; isPublic: boolean; ownerId: string; link: string };
    expect(ref.isPublic).toBe(true);
    expect(ref.ownerId).toBe(userA.id);
    expect(ref.link).toBe('https://github.com/herdr/herdr');
  });

  it('creates and updates skill for user A', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const createRes = await createSkillAction({
      slug: 'skill-alpha',
      name: 'Skill Alpha',
      description: 'Alpha version',
    });

    expect(createRes.success).toBe(true);
    const skill = createRes.data as { id: string; name: string };

    const updateRes = await updateSkillAction({
      id: skill.id,
      name: 'Skill Alpha Renamed',
    });

    expect(updateRes.success).toBe(true);
  });

  it('prevents user A from modifying or deleting contexts belonging to user B', async () => {
    // User B creates an idea
    const ideaB = await prisma.context.create({
      data: {
        type: 'idea',
        title: 'Idea Secreta B',
        ownerId: userB.id,
      },
    });

    // User A attempts to update user B's idea
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const updateRes = await updateIdeaAction({
      id: ideaB.id,
      title: 'Hackeado por A',
    });

    expect(updateRes.success).toBe(false);
    expect(updateRes.error).toContain('no pertenece a tu usuario');

    // User A attempts to delete user B's idea
    const deleteRes = await deleteContextAction(ideaB.id);
    expect(deleteRes.success).toBe(false);
    expect(deleteRes.error).toContain('no pertenece a tu usuario');

    // Verify idea B is intact
    const checkIdeaB = await prisma.context.findUnique({ where: { id: ideaB.id } });
    expect(checkIdeaB?.title).toBe('Idea Secreta B');
  });

  it('prevents user A from modifying or deleting skills belonging to user B', async () => {
    // User B creates a skill
    const skillB = await prisma.skill.create({
      data: {
        slug: 'skill-b',
        name: 'Skill de B',
        ownerId: userB.id,
      },
    });

    // User A attempts to update user B's skill
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const updateRes = await updateSkillAction({
      id: skillB.id,
      name: 'Intentado modificar por A',
    });

    expect(updateRes.success).toBe(false);
    expect(updateRes.error).toContain('no pertenece a tu usuario');

    // User A attempts to delete user B's skill
    const deleteRes = await deleteSkillAction(skillB.id);
    expect(deleteRes.success).toBe(false);
    expect(deleteRes.error).toContain('no pertenece a tu usuario');

    // Verify skill B is intact
    const checkSkillB = await prisma.skill.findUnique({ where: { id: skillB.id } });
    expect(checkSkillB?.name).toBe('Skill de B');
  });

  it('creates access token and returns rawToken for user A', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const res = await createAccessTokenAction({
      label: 'Token Test A',
      scopes: ['read', 'write'],
    });

    expect(res.success).toBe(true);
    expect(res.data?.rawToken.startsWith('ccs_')).toBe(true);
    expect(res.data?.accessToken.ownerId).toBe(userA.id);
    expect(res.data?.accessToken.label).toBe('Token Test A');
  });

  it('prevents user A from revoking access token belonging to user B', async () => {
    // User B creates a token directly
    const tokenB = await prisma.accessToken.create({
      data: {
        ownerId: userB.id,
        tokenHash: hashToken('ccs_userbtesttoken0000000000000000000000000000000000000000000000000000000'),
        label: 'Secret Token B',
        scopes: ['read'],
      },
    });

    // User A attempts to revoke user B's token
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const res = await revokeAccessTokenAction(tokenB.id);
    expect(res.success).toBe(false);
    expect(res.error).toContain('no pertenece a tu usuario');

    // Verify token B remains active
    const checkTokenB = await prisma.accessToken.findUnique({ where: { id: tokenB.id } });
    expect(checkTokenB?.revokedAt).toBeNull();
  });
});
