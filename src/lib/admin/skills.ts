import { prisma } from '@/lib/prisma';
import type { Skill, SkillVersion } from '@prisma/client';
import {
  createSkillSchema,
  updateSkillSchema,
  type CreateSkillInput,
  type UpdateSkillInput,
} from '@/lib/validations/skill';
import { AuthorizationError } from '@/lib/admin/contexts';
import { Prisma } from '@prisma/client';

export class ConflictError extends Error {
  constructor(message = 'Ya existe un recurso con este identificador') {
    super(message);
    this.name = 'ConflictError';
  }
}

export type SkillWithVersions = Skill & {
  versions: SkillVersion[];
};

export async function getUserSkills(ownerId: string): Promise<SkillWithVersions[]> {
  return await prisma.skill.findMany({
    where: {
      ownerId,
      isArchived: false,
    },
    include: {
      versions: {
        orderBy: { publishedAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUserSkillById(id: string, ownerId: string): Promise<SkillWithVersions | null> {
  return await prisma.skill.findFirst({
    where: {
      id,
      ownerId,
    },
    include: {
      versions: {
        orderBy: { publishedAt: 'desc' },
      },
    },
  });
}

export async function createUserSkill(ownerId: string, input: CreateSkillInput): Promise<Skill> {
  const data = createSkillSchema.parse(input);
  try {
    return await prisma.skill.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description || null,
        license: data.license || 'MIT',
        repositoryUrl: data.repositoryUrl || null,
        ownerId,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(`Ya tienes una skill registrada con el slug "${data.slug}"`);
    }
    throw error;
  }
}

export async function updateUserSkill(ownerId: string, input: UpdateSkillInput): Promise<Skill> {
  const data = updateSkillSchema.parse(input);
  const existing = await prisma.skill.findFirst({
    where: { id: data.id, ownerId },
  });

  if (!existing) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  return await prisma.skill.update({
    where: { id: data.id },
    data: {
      name: data.name,
      description: data.description || null,
      license: data.license || 'MIT',
      repositoryUrl: data.repositoryUrl || null,
    },
  });
}

export async function deleteUserSkill(id: string, ownerId: string): Promise<Skill> {
  const existing = await prisma.skill.findFirst({
    where: { id, ownerId },
  });

  if (!existing) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  return await prisma.skill.delete({
    where: { id },
  });
}
