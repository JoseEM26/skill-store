import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { DELETE } from '../route';
import type { Session } from 'next-auth';

const mockAuth = vi.fn();

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

describe('DELETE /api/account Route Handler', () => {
  let user: { id: string; username: string };

  beforeEach(async () => {
    vi.clearAllMocks();

    user = await prisma.user.create({
      data: {
        githubId: `test-api-acc-${Date.now()}`,
        username: `api_user_${Date.now()}`,
      },
    });
  });

  afterEach(async () => {
    if (user?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: user.id } });
      await prisma.context.deleteMany({ where: { ownerId: user.id } });
      await prisma.skill.deleteMany({ where: { ownerId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Debes iniciar sesión');
  });

  it('successfully executes account deletion when authenticated', async () => {
    mockAuth.mockResolvedValue({
      user: { id: user.id, name: user.username },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const skill = await prisma.skill.create({
      data: {
        slug: 'api-acc-skill',
        name: 'API Account Skill',
        ownerId: user.id,
      },
    });

    const res = await DELETE();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const checkSkill = await prisma.skill.findUnique({ where: { id: skill.id } });
    expect(checkSkill?.isArchived).toBe(true);
  });
});
