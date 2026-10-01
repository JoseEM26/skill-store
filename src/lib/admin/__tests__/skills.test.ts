import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createUserSkill,
  updateUserSkill,
  deleteUserSkill,
  getUserSkills,
  getUserSkillById,
  ConflictError,
} from '../skills';
import { AuthorizationError } from '../contexts';

describe('Admin Skills Service (Ownership & Isolation)', () => {
  let userA: { id: string; githubId: string };
  let userB: { id: string; githubId: string };

  beforeEach(async () => {
    userA = await prisma.user.create({
      data: {
        githubId: `test-admin-skills-a-${Date.now()}`,
        username: 'userA_skills',
      },
    });

    userB = await prisma.user.create({
      data: {
        githubId: `test-admin-skills-b-${Date.now()}`,
        username: 'userB_skills',
      },
    });
  });

  afterEach(async () => {
    if (userA?.id) {
      await prisma.skill.deleteMany({ where: { ownerId: userA.id } });
      await prisma.user.deleteMany({ where: { id: userA.id } });
    }
    if (userB?.id) {
      await prisma.skill.deleteMany({ where: { ownerId: userB.id } });
      await prisma.user.deleteMany({ where: { id: userB.id } });
    }
  });

  it('creates a skill assigned to owner with downloadsCount and installsCount as 0', async () => {
    const skill = await createUserSkill(userA.id, {
      slug: 'my-cool-skill',
      name: 'My Cool Skill',
      description: 'Cool description',
      license: 'MIT',
      repositoryUrl: 'https://github.com/userA/my-cool-skill',
    });

    expect(skill.id).toBeDefined();
    expect(skill.ownerId).toBe(userA.id);
    expect(skill.downloadsCount).toBe(0);
    expect(skill.installsCount).toBe(0);

    const skillsA = await getUserSkills(userA.id);
    expect(skillsA.length).toBe(1);
    expect(skillsA[0].slug).toBe('my-cool-skill');
  });

  it('allows same slug for different users without collision', async () => {
    const skillA = await createUserSkill(userA.id, {
      slug: 'shared-name-skill',
      name: 'Skill de A',
    });

    const skillB = await createUserSkill(userB.id, {
      slug: 'shared-name-skill',
      name: 'Skill de B',
    });

    expect(skillA.slug).toBe(skillB.slug);
    expect(skillA.ownerId).not.toBe(skillB.ownerId);
  });

  it('rejects duplicate slug for the same user with ConflictError', async () => {
    await createUserSkill(userA.id, {
      slug: 'unique-slug',
      name: 'First Skill',
    });

    await expect(
      createUserSkill(userA.id, {
        slug: 'unique-slug',
        name: 'Second Skill Same Slug',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('prevents user A from modifying or deleting skills owned by user B', async () => {
    const skillB = await createUserSkill(userB.id, {
      slug: 'skill-of-b',
      name: 'Skill Original B',
    });

    await expect(
      updateUserSkill(userA.id, {
        id: skillB.id,
        name: 'Modified By A',
      })
    ).rejects.toThrow(AuthorizationError);

    await expect(deleteUserSkill(skillB.id, userA.id)).rejects.toThrow(AuthorizationError);

    const checkB = await getUserSkillById(skillB.id, userB.id);
    expect(checkB?.name).toBe('Skill Original B');
  });

  it('rejects update and delete operations on archived skills with AuthorizationError', async () => {
    const archivedSkill = await prisma.skill.create({
      data: {
        slug: 'archived-skill-mod-test',
        name: 'Archived Skill',
        ownerId: userA.id,
        isArchived: true,
      },
    });

    await expect(
      updateUserSkill(userA.id, {
        id: archivedSkill.id,
        name: 'Should Fail',
      })
    ).rejects.toThrow(AuthorizationError);

    await expect(
      deleteUserSkill(archivedSkill.id, userA.id)
    ).rejects.toThrow(AuthorizationError);
  });
});
