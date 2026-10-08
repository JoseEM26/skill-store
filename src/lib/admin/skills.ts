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
import { parseSkillMarkdown } from '@/lib/skills/validation';

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
        isPublic: data.isPublic,
        isPaused: data.isPaused,
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

  if (existing.isArchived) {
    throw new AuthorizationError('No se pueden modificar recursos archivados');
  }

  const updateData: Prisma.SkillUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.license !== undefined) updateData.license = data.license || 'MIT';
  if (data.repositoryUrl !== undefined) updateData.repositoryUrl = data.repositoryUrl || null;
  if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
  if (data.isPaused !== undefined) updateData.isPaused = data.isPaused;

  return await prisma.skill.update({
    where: { id: data.id },
    data: updateData,
  });
}

export async function deleteUserSkill(id: string, ownerId: string): Promise<Skill> {
  const existing = await prisma.skill.findFirst({
    where: { id, ownerId },
  });

  if (!existing) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  if (existing.isArchived) {
    throw new AuthorizationError('No se pueden eliminar recursos archivados');
  }

  return await prisma.skill.delete({
    where: { id },
  });
}

export async function updateUserSkillContent(
  ownerId: string,
  skillId: string,
  content: string,
  options?: { isPublic?: boolean }
): Promise<Skill> {
  const existing = await prisma.skill.findFirst({
    where: { id: skillId, ownerId },
    include: { versions: true },
  });

  if (!existing) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  if (existing.isArchived) {
    throw new AuthorizationError('No se pueden modificar recursos archivados');
  }

  // Parse and validate content (strict frontmatter + 6 body sections)
  const parsed = parseSkillMarkdown(content);
  const { name, description, license, metadata } = parsed.frontmatter;
  const version = metadata.version;

  return await prisma.$transaction(async (tx) => {
    const updateData: Prisma.SkillUpdateInput = {
      name,
      description: description || null,
      license: license || 'MIT',
    };
    if (options?.isPublic !== undefined) {
      updateData.isPublic = options.isPublic;
    }

    const updatedSkill = await tx.skill.update({
      where: { id: skillId },
      data: updateData,
    });

    const existingVersion = await tx.skillVersion.findUnique({
      where: {
        skillId_version: {
          skillId,
          version,
        },
      },
    });

    const filesToSave = { 'SKILL.md': content };

    if (existingVersion) {
      await tx.skillVersion.update({
        where: { id: existingVersion.id },
        data: {
          files: filesToSave as Prisma.InputJsonValue,
        },
      });
    } else {
      await tx.skillVersion.create({
        data: {
          skillId,
          version,
          changelog: `Publicación de versión ${version}`,
          gitTag: `${existing.slug}-v${version}`,
          files: filesToSave as Prisma.InputJsonValue,
        },
      });
    }

    return updatedSkill;
  });
}

export async function createUserSkillContent(
  ownerId: string,
  content: string,
  options?: { isPublic?: boolean }
): Promise<Skill> {
  const parsed = parseSkillMarkdown(content);
  const { name, description, license, metadata } = parsed.frontmatter;
  const slug = parsed.slug;
  const version = metadata.version;

  const existing = await prisma.skill.findUnique({
    where: {
      ownerId_slug: {
        ownerId,
        slug,
      },
    },
  });

  if (existing) {
    throw new ConflictError(`Ya tienes una skill registrada con el slug "${slug}"`);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const createdSkill = await tx.skill.create({
        data: {
          slug,
          name,
          description: description || null,
          license: license || 'MIT',
          isPublic: options?.isPublic ?? true,
          ownerId,
        },
      });

      const filesToSave = { 'SKILL.md': content };

      await tx.skillVersion.create({
        data: {
          skillId: createdSkill.id,
          version,
          changelog: `Publicación de versión ${version}`,
          gitTag: `${slug}-v${version}`,
          files: filesToSave as Prisma.InputJsonValue,
        },
      });

      return createdSkill;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(`Ya tienes una skill registrada con el slug "${slug}"`);
    }
    throw error;
  }
}


