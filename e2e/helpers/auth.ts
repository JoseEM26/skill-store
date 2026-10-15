import type { BrowserContext } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SECRET = process.env.AUTH_SECRET || 'dummy-auth-secret-for-local-testing-32-chars-long-min';

/**
 * Sets a real NextAuth session cookie for a given user on the given browser context,
 * without going through GitHub OAuth. Mirrors the project's existing admin auth.
 */
export async function loginAsUser(
  context: BrowserContext,
  user: { id: string; username: string }
): Promise<void> {
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      userId: user.id,
      githubId: `gh_${user.username}`,
      username: user.username,
      name: user.username,
    },
    secret: SECRET,
    salt: 'authjs.session-token',
  });

  await context.addCookies([
    {
      name: 'authjs.session-token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

/** Finds (or creates) a dedicated E2E test user, isolated from real seed data. */
export async function getOrCreateE2EUser(usernameSuffix: string): Promise<{ id: string; username: string }> {
  const username = `e2e-${usernameSuffix}`;
  const existing = await prisma.user.findFirst({ where: { username } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      username,
      githubId: `gh_${username}`,
      avatarUrl: `https://github.com/${username}.png`,
    },
  });
}

export { prisma as e2ePrisma };
