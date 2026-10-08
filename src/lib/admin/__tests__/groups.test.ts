import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createUserGroup,
  getUserGroups,
  getUserGroupById,
  renameUserGroup,
  deleteUserGroup,
  addSkillToGroup,
  removeSkillFromGroup,
} from '../groups';
import { createUserSkill } from '../skills';
import { AuthorizationError } from '../contexts';

describe('Admin Groups Service (Ownership & Isolation)', () => {
  let userA: { id: string; githubId: string };
  let userB: { id: string; githubId: string };

  beforeEach(async () => {
    userA = await prisma.user.create({
      data: {
        githubId: `test-admin-groups-a-${Date.now()}`,
        username: 'userA_groups',
      },
    });

    userB = await prisma.user.create({
      data: {
        githubId: `test-admin-groups-b-${Date.now()}`,
        username: 'userB_groups',
      },
    });
  });

  afterEach(async () => {
    if (userA?.id) {
      await prisma.skillGroup.deleteMany({ where: { ownerId: userA.id } });
      await prisma.skill.deleteMany({ where: { ownerId: userA.id } });
      await prisma.user.deleteMany({ where: { id: userA.id } });
    }
    if (userB?.id) {
      await prisma.skillGroup.deleteMany({ where: { ownerId: userB.id } });
      await prisma.skill.deleteMany({ where: { ownerId: userB.id } });
      await prisma.user.deleteMany({ where: { id: userB.id } });
    }
  });

  it('creates, renames, and deletes own group', async () => {
    // Create group
    const group = await createUserGroup(userA.id, 'Stack Frontend');
    expect(group.id).toBeDefined();
    expect(group.name).toBe('Stack Frontend');
    expect(group.ownerId).toBe(userA.id);

    // List groups
    const groups = await getUserGroups(userA.id);
    expect(groups.length).toBe(1);
    expect(groups[0].name).toBe('Stack Frontend');
    expect(groups[0]._count.items).toBe(0);

    // Rename group
    const renamed = await renameUserGroup(userA.id, group.id, 'Stack Frontend v2');
    expect(renamed.name).toBe('Stack Frontend v2');

    const updated = await getUserGroupById(userA.id, group.id);
    expect(updated?.name).toBe('Stack Frontend v2');

    // Delete group
    const deleted = await deleteUserGroup(userA.id, group.id);
    expect(deleted.id).toBe(group.id);

    const remainingGroups = await getUserGroups(userA.id);
    expect(remainingGroups.length).toBe(0);
  });

  it('allows adding a public skill of another user to own group', async () => {
    const groupA = await createUserGroup(userA.id, 'Grupo de A');
    const skillB = await createUserSkill(userB.id, {
      slug: 'public-skill-of-b',
      name: 'Public Skill de B',
      isPublic: true,
      isPaused: false,
    });

    const item = await addSkillToGroup(userA.id, groupA.id, skillB.id);
    expect(item.groupId).toBe(groupA.id);
    expect(item.skillId).toBe(skillB.id);

    const groupDetails = await getUserGroupById(userA.id, groupA.id);
    expect(groupDetails?.items.length).toBe(1);
    expect(groupDetails?.items[0].skillId).toBe(skillB.id);
  });

  it('rejects adding a private or paused skill of another user to own group with AuthorizationError', async () => {
    const groupA = await createUserGroup(userA.id, 'Grupo de A');
    const privateSkillB = await createUserSkill(userB.id, {
      slug: 'private-skill-b',
      name: 'Private Skill B',
      isPublic: false,
      isPaused: false,
    });
    const pausedSkillB = await createUserSkill(userB.id, {
      slug: 'paused-skill-b',
      name: 'Paused Skill B',
      isPublic: true,
      isPaused: true,
    });
    const archivedSkillB = await createUserSkill(userB.id, {
      slug: 'archived-skill-b',
      name: 'Archived Skill B',
      isPublic: true,
      isPaused: false,
    });
    await prisma.skill.update({
      where: { id: archivedSkillB.id },
      data: { isArchived: true },
    });

    await expect(
      addSkillToGroup(userA.id, groupA.id, privateSkillB.id)
    ).rejects.toThrow(AuthorizationError);

    await expect(
      addSkillToGroup(userA.id, groupA.id, pausedSkillB.id)
    ).rejects.toThrow(AuthorizationError);

    await expect(
      addSkillToGroup(userA.id, groupA.id, archivedSkillB.id)
    ).rejects.toThrow(AuthorizationError);

    const groupDetails = await getUserGroupById(userA.id, groupA.id);
    expect(groupDetails?.items.length).toBe(0);
  });

  it('allows adding own skill (private or public) to own group as regression check', async () => {
    const groupA = await createUserGroup(userA.id, 'Grupo Propio');
    const ownPrivateSkill = await createUserSkill(userA.id, {
      slug: 'own-private-skill',
      name: 'Own Private Skill',
      isPublic: false,
      isPaused: false,
    });
    const ownPublicSkill = await createUserSkill(userA.id, {
      slug: 'own-public-skill',
      name: 'Own Public Skill',
      isPublic: true,
      isPaused: false,
    });
    const ownPausedSkill = await createUserSkill(userA.id, {
      slug: 'own-paused-skill',
      name: 'Own Paused Skill',
      isPublic: true,
      isPaused: true,
    });

    await addSkillToGroup(userA.id, groupA.id, ownPrivateSkill.id);
    await addSkillToGroup(userA.id, groupA.id, ownPublicSkill.id);
    await addSkillToGroup(userA.id, groupA.id, ownPausedSkill.id);

    const groupDetails = await getUserGroupById(userA.id, groupA.id);
    expect(groupDetails?.items.length).toBe(3);
    const itemIds = groupDetails?.items.map((i) => i.skillId);
    expect(itemIds).toContain(ownPrivateSkill.id);
    expect(itemIds).toContain(ownPublicSkill.id);
    expect(itemIds).toContain(ownPausedSkill.id);
  });

  it('deleting a group does not delete the skills it contained', async () => {
    const groupA = await createUserGroup(userA.id, 'Grupo con Skills');
    const skill1 = await createUserSkill(userA.id, {
      slug: 'skill-uno',
      name: 'Skill Uno',
    });
    const skill2 = await createUserSkill(userA.id, {
      slug: 'skill-dos',
      name: 'Skill Dos',
    });

    await addSkillToGroup(userA.id, groupA.id, skill1.id);
    await addSkillToGroup(userA.id, groupA.id, skill2.id);

    const groupBeforeDelete = await getUserGroupById(userA.id, groupA.id);
    expect(groupBeforeDelete?.items.length).toBe(2);

    // Delete group
    await deleteUserGroup(userA.id, groupA.id);

    // Verify skills still exist
    const checkSkill1 = await prisma.skill.findUnique({ where: { id: skill1.id } });
    const checkSkill2 = await prisma.skill.findUnique({ where: { id: skill2.id } });

    expect(checkSkill1).not.toBeNull();
    expect(checkSkill1?.name).toBe('Skill Uno');
    expect(checkSkill2).not.toBeNull();
    expect(checkSkill2?.name).toBe('Skill Dos');

    // Verify SkillGroupItem records were deleted
    const remainingItems = await prisma.skillGroupItem.findMany({
      where: { groupId: groupA.id },
    });
    expect(remainingItems.length).toBe(0);
  });

  it('allows the same skill to be added to two different groups without conflict', async () => {
    const group1 = await createUserGroup(userA.id, 'Grupo 1');
    const group2 = await createUserGroup(userA.id, 'Grupo 2');
    const skill = await createUserSkill(userA.id, {
      slug: 'shared-skill',
      name: 'Shared Skill',
    });

    const item1 = await addSkillToGroup(userA.id, group1.id, skill.id);
    const item2 = await addSkillToGroup(userA.id, group2.id, skill.id);

    expect(item1.groupId).toBe(group1.id);
    expect(item1.skillId).toBe(skill.id);
    expect(item2.groupId).toBe(group2.id);
    expect(item2.skillId).toBe(skill.id);

    const g1 = await getUserGroupById(userA.id, group1.id);
    const g2 = await getUserGroupById(userA.id, group2.id);

    expect(g1?.items.length).toBe(1);
    expect(g1?.items[0].skillId).toBe(skill.id);
    expect(g2?.items.length).toBe(1);
    expect(g2?.items[0].skillId).toBe(skill.id);
  });

  it('prevents user A from renaming, deleting, or adding/removing skills to a group owned by user B', async () => {
    const groupB = await createUserGroup(userB.id, 'Grupo Privado de B');
    const skillA = await createUserSkill(userA.id, {
      slug: 'skill-a-probe',
      name: 'Skill A',
    });
    const skillB = await createUserSkill(userB.id, {
      slug: 'skill-b-probe',
      name: 'Skill B',
    });

    await addSkillToGroup(userB.id, groupB.id, skillB.id);

    // User A attempts to rename group B
    await expect(
      renameUserGroup(userA.id, groupB.id, 'Hacked Group Name')
    ).rejects.toThrow(AuthorizationError);

    // User A attempts to delete group B
    await expect(
      deleteUserGroup(userA.id, groupB.id)
    ).rejects.toThrow(AuthorizationError);

    // User A attempts to add skill to group B
    await expect(
      addSkillToGroup(userA.id, groupB.id, skillA.id)
    ).rejects.toThrow(AuthorizationError);

    // User A attempts to remove skill from group B
    await expect(
      removeSkillFromGroup(userA.id, groupB.id, skillB.id)
    ).rejects.toThrow(AuthorizationError);

    // Verify group B remained unchanged
    const checkB = await getUserGroupById(userB.id, groupB.id);
    expect(checkB?.name).toBe('Grupo Privado de B');
    expect(checkB?.items.length).toBe(1);
  });

  it('allows owner to remove a skill from a group', async () => {
    const group = await createUserGroup(userA.id, 'Grupo a Modificar');
    const skill = await createUserSkill(userA.id, {
      slug: 'skill-to-remove',
      name: 'Skill to Remove',
    });

    await addSkillToGroup(userA.id, group.id, skill.id);
    const beforeRemove = await getUserGroupById(userA.id, group.id);
    expect(beforeRemove?.items.length).toBe(1);

    await removeSkillFromGroup(userA.id, group.id, skill.id);

    const afterRemove = await getUserGroupById(userA.id, group.id);
    expect(afterRemove?.items.length).toBe(0);

    // Skill itself still exists
    const skillStillExists = await prisma.skill.findUnique({ where: { id: skill.id } });
    expect(skillStillExists).not.toBeNull();
  });
});
