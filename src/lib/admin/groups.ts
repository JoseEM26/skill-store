import { prisma } from '@/lib/prisma';
import type { Skill, SkillGroup, SkillGroupItem } from '@prisma/client';
import { AuthorizationError } from '@/lib/admin/contexts';

export type SkillGroupWithCount = SkillGroup & {
  _count: {
    items: number;
  };
};

export type SkillGroupWithItems = SkillGroup & {
  items: (SkillGroupItem & { skill: Skill })[];
  _count?: {
    items: number;
  };
};

export async function getUserGroups(ownerId: string): Promise<SkillGroupWithCount[]> {
  return await prisma.skillGroup.findMany({
    where: {
      ownerId,
    },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUserGroupById(
  ownerId: string,
  groupId: string
): Promise<SkillGroupWithItems | null> {
  return await prisma.skillGroup.findFirst({
    where: {
      id: groupId,
      ownerId,
    },
    include: {
      items: {
        include: {
          skill: true,
        },
        orderBy: { addedAt: 'asc' },
      },
      _count: {
        select: { items: true },
      },
    },
  });
}

export async function createUserGroup(ownerId: string, name: string): Promise<SkillGroup> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('El nombre del grupo es requerido');
  }

  return await prisma.skillGroup.create({
    data: {
      name: trimmedName,
      ownerId,
    },
  });
}

export async function renameUserGroup(
  ownerId: string,
  groupId: string,
  newName: string
): Promise<SkillGroup> {
  const trimmedName = newName.trim();
  if (!trimmedName) {
    throw new Error('El nombre del grupo es requerido');
  }

  const existing = await prisma.skillGroup.findFirst({
    where: { id: groupId, ownerId },
  });

  if (!existing) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  return await prisma.skillGroup.update({
    where: { id: groupId },
    data: {
      name: trimmedName,
    },
  });
}

export async function deleteUserGroup(ownerId: string, groupId: string): Promise<SkillGroup> {
  const existing = await prisma.skillGroup.findFirst({
    where: { id: groupId, ownerId },
  });

  if (!existing) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  return await prisma.skillGroup.delete({
    where: { id: groupId },
  });
}

export async function addSkillToGroup(
  ownerId: string,
  groupId: string,
  skillId: string
): Promise<SkillGroupItem> {
  const group = await prisma.skillGroup.findFirst({
    where: { id: groupId, ownerId },
  });

  if (!group) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  const skill = await prisma.skill.findFirst({
    where: {
      id: skillId,
      OR: [
        { ownerId },
        { isPublic: true, isPaused: false, isArchived: false },
      ],
    },
  });

  if (!skill) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  return await prisma.skillGroupItem.upsert({
    where: {
      groupId_skillId: {
        groupId,
        skillId,
      },
    },
    create: {
      groupId,
      skillId,
    },
    update: {},
  });
}

export async function removeSkillFromGroup(
  ownerId: string,
  groupId: string,
  skillId: string
): Promise<SkillGroupItem | null> {
  const group = await prisma.skillGroup.findFirst({
    where: { id: groupId, ownerId },
  });

  if (!group) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  const existing = await prisma.skillGroupItem.findUnique({
    where: {
      groupId_skillId: {
        groupId,
        skillId,
      },
    },
  });

  if (!existing) {
    return null;
  }

  return await prisma.skillGroupItem.delete({
    where: {
      groupId_skillId: {
        groupId,
        skillId,
      },
    },
  });
}
