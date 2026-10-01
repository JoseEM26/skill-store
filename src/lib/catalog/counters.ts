import { prisma } from '@/lib/prisma';

export interface CounterResult {
  id: string;
  slug: string;
  downloadsCount: number;
  installsCount: number;
}

/**
 * Increments downloadsCount of an active skill atomically by 1.
 * Returns null if the skill is not found or is archived.
 */
export async function incrementDownloadsCount(
  ownerUsername: string,
  slug: string
): Promise<CounterResult | null> {
  const skill = await prisma.skill.findFirst({
    where: {
      slug,
      isArchived: false,
      owner: {
        username: ownerUsername,
      },
    },
    select: { id: true },
  });

  if (!skill) {
    return null;
  }

  const updated = await prisma.skill.update({
    where: { id: skill.id },
    data: {
      downloadsCount: {
        increment: 1,
      },
    },
    select: {
      id: true,
      slug: true,
      downloadsCount: true,
      installsCount: true,
    },
  });

  return updated;
}

/**
 * Increments installsCount of an active skill atomically by 1.
 * Returns null if the skill is not found or is archived.
 */
export async function incrementInstallsCount(
  ownerUsername: string,
  slug: string
): Promise<CounterResult | null> {
  const skill = await prisma.skill.findFirst({
    where: {
      slug,
      isArchived: false,
      owner: {
        username: ownerUsername,
      },
    },
    select: { id: true },
  });

  if (!skill) {
    return null;
  }

  const updated = await prisma.skill.update({
    where: { id: skill.id },
    data: {
      installsCount: {
        increment: 1,
      },
    },
    select: {
      id: true,
      slug: true,
      downloadsCount: true,
      installsCount: true,
    },
  });

  return updated;
}
