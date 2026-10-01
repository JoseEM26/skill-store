import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

export interface SyncUserInput {
  githubId: string;
  username: string;
  avatarUrl?: string | null;
}

/**
 * Upserts a User record from GitHub profile data.
 * If user exists by githubId, updates username and avatarUrl.
 * If not, creates a new User.
 */
export async function syncUserFromGitHub(data: SyncUserInput): Promise<User> {
  return await prisma.user.upsert({
    where: { githubId: data.githubId },
    update: {
      username: data.username,
      avatarUrl: data.avatarUrl ?? null,
    },
    create: {
      githubId: data.githubId,
      username: data.username,
      avatarUrl: data.avatarUrl ?? null,
    },
  });
}
