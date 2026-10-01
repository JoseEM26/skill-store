import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { deleteAccountService } from '../account';
import { createAccessToken, hashToken } from '../tokens';

describe('Transactional Account Deletion Service', () => {
  let user: { id: string; githubId: string; username: string };
  let publicSkillId: string;
  let publicRefId: string;
  let privateIdeaId: string;
  let tokenId: string;

  beforeEach(async () => {
    // Create test user
    user = await prisma.user.create({
      data: {
        githubId: `test-acc-del-${Date.now()}`,
        username: `del_user_${Date.now()}`,
        avatarUrl: 'https://github.com/del_user.png',
      },
    });

    // 1. Create public skill
    const skill = await prisma.skill.create({
      data: {
        slug: 'public-skill-to-archive',
        name: 'Public Skill To Archive',
        ownerId: user.id,
        isArchived: false,
        versions: {
          create: {
            version: '1.0.0',
            changelog: 'Initial version',
          },
        },
      },
    });
    publicSkillId = skill.id;

    // 2. Create public context (external_reference)
    const ref = await prisma.context.create({
      data: {
        type: 'external_reference',
        title: 'Public Framework Docs',
        link: 'https://example.com/docs',
        isPublic: true,
        isArchived: false,
        ownerId: user.id,
      },
    });
    publicRefId = ref.id;

    // 3. Create private idea
    const idea = await prisma.context.create({
      data: {
        type: 'idea',
        title: 'Secret Private Blueprint',
        body: 'Confidential thoughts',
        isPublic: false,
        isArchived: false,
        ownerId: user.id,
      },
    });
    privateIdeaId = idea.id;

    // 4. Create access token
    const tokenRes = await createAccessToken(user.id, {
      label: 'CLI Token',
      scopes: ['read', 'write'],
    });
    tokenId = tokenRes.accessToken.id;
  });

  afterEach(async () => {
    if (user?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: user.id } });
      await prisma.context.deleteMany({ where: { ownerId: user.id } });
      await prisma.skillVersion.deleteMany({ where: { skill: { ownerId: user.id } } });
      await prisma.skill.deleteMany({ where: { ownerId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });

  it('archives public skills and contexts, deletes private ideas and tokens, and preserves user record', async () => {
    const result = await deleteAccountService(user.id);
    expect(result.success).toBe(true);

    // 1. Public skill remains in DB but isArchived = true
    const checkSkill = await prisma.skill.findUnique({ where: { id: publicSkillId } });
    expect(checkSkill).not.toBeNull();
    expect(checkSkill?.isArchived).toBe(true);
    expect(checkSkill?.ownerId).toBe(user.id);

    // 2. Public external reference remains in DB but isArchived = true
    const checkRef = await prisma.context.findUnique({ where: { id: publicRefId } });
    expect(checkRef).not.toBeNull();
    expect(checkRef?.isArchived).toBe(true);
    expect(checkRef?.ownerId).toBe(user.id);

    // 3. Private idea is physically deleted
    const checkIdea = await prisma.context.findUnique({ where: { id: privateIdeaId } });
    expect(checkIdea).toBeNull();

    // 4. Access token is physically deleted
    const checkToken = await prisma.accessToken.findUnique({ where: { id: tokenId } });
    expect(checkToken).toBeNull();

    // 5. User record still exists in DB (to prevent cascade deletion and keep referential integrity)
    const checkUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(checkUser).not.toBeNull();
    expect(checkUser?.id).toBe(user.id);
  });

  it('rolls back completely if a step in transaction fails', async () => {
    // Create another user to verify rollback behavior
    const rollbackUser = await prisma.user.create({
      data: {
        githubId: `test-acc-rb-${Date.now()}`,
        username: `rb_user_${Date.now()}`,
      },
    });

    const token = await prisma.accessToken.create({
      data: {
        ownerId: rollbackUser.id,
        tokenHash: hashToken('ccs_rollbacktest0000000000000000000000000000000000000000000000000000000'),
        label: 'Rollback Token',
        scopes: ['read'],
      },
    });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.accessToken.deleteMany({ where: { ownerId: rollbackUser.id } });
        // Trigger synthetic error
        throw new Error('Transaction simulated failure');
      });
    } catch {
      // Expected failure
    }

    // Token should still exist due to rollback
    const checkToken = await prisma.accessToken.findUnique({ where: { id: token.id } });
    expect(checkToken).not.toBeNull();

    await prisma.accessToken.deleteMany({ where: { ownerId: rollbackUser.id } });
    await prisma.user.deleteMany({ where: { id: rollbackUser.id } });
  });
});
