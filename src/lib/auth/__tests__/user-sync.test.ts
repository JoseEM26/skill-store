import { describe, it, expect, afterEach } from 'vitest';
import { syncUserFromGitHub } from '../user-sync';
import { prisma } from '@/lib/prisma';

describe('syncUserFromGitHub', () => {
  const testGithubId = 'test-gh-user-sync-123456';

  afterEach(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({
      where: { githubId: testGithubId },
    });
  });

  it('creates a new user when githubId does not exist', async () => {
    const user = await syncUserFromGitHub({
      githubId: testGithubId,
      username: 'octocat-test',
      avatarUrl: 'https://github.com/images/error/octocat_happy.gif',
    });

    expect(user.id).toBeDefined();
    expect(user.githubId).toBe(testGithubId);
    expect(user.username).toBe('octocat-test');
    expect(user.avatarUrl).toBe('https://github.com/images/error/octocat_happy.gif');

    const dbUser = await prisma.user.findUnique({
      where: { githubId: testGithubId },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.username).toBe('octocat-test');
  });

  it('updates existing user on subsequent syncs while keeping id immutable', async () => {
    const firstUser = await syncUserFromGitHub({
      githubId: testGithubId,
      username: 'octocat-original',
      avatarUrl: 'https://avatar1.png',
    });

    const updatedUser = await syncUserFromGitHub({
      githubId: testGithubId,
      username: 'octocat-updated',
      avatarUrl: 'https://avatar2.png',
    });

    expect(updatedUser.id).toBe(firstUser.id);
    expect(updatedUser.username).toBe('octocat-updated');
    expect(updatedUser.avatarUrl).toBe('https://avatar2.png');
  });
});
