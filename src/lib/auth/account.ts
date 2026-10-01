import { prisma } from '@/lib/prisma';

export interface DeleteAccountResult {
  success: boolean;
}

/**
 * Service to delete / revoke a user account:
 * - Deletes private ideas physically (Context with type='idea' and isPublic=false).
 * - Deletes access tokens physically (AccessToken).
 * - Soft-archives public skills (Skill with isArchived=true).
 * - Soft-archives public contexts (Context with isPublic=true and isArchived=true).
 * - Preserves the User record in PostgreSQL to maintain referential integrity of ownerId.
 * 
 * Runs as an atomic transaction using Prisma $transaction.
 */
export async function deleteAccountService(userId: string): Promise<DeleteAccountResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Delete private ideas permanently
    await tx.context.deleteMany({
      where: {
        ownerId: userId,
        isPublic: false,
        type: 'idea',
      },
    });

    // 2. Delete access tokens permanently
    await tx.accessToken.deleteMany({
      where: {
        ownerId: userId,
      },
    });

    // 3. Soft-archive all user's skills
    await tx.skill.updateMany({
      where: {
        ownerId: userId,
      },
      data: {
        isArchived: true,
      },
    });

    // 4. Soft-archive all public contexts (public ideas and external references)
    await tx.context.updateMany({
      where: {
        ownerId: userId,
        isPublic: true,
      },
      data: {
        isArchived: true,
      },
    });

    return { success: true };
  });
}

export const deleteAccount = deleteAccountService;
