import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authConfig } from '../config';
import * as userSync from '../user-sync';
import type { JWT } from 'next-auth/jwt';
import type { Session, Account, Profile } from 'next-auth';

type JwtCallback = NonNullable<NonNullable<typeof authConfig.callbacks>['jwt']>;
type JwtParam = Parameters<JwtCallback>[0];

type SessionCallback = NonNullable<NonNullable<typeof authConfig.callbacks>['session']>;
type SessionParam = Parameters<SessionCallback>[0];

describe('Auth.js callbacks in authConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('jwt callback calls syncUserFromGitHub and enriches token', async () => {
    const syncSpy = vi.spyOn(userSync, 'syncUserFromGitHub').mockResolvedValue({
      id: 'db_user_123',
      githubId: '12345',
      username: 'mockoctocat',
      avatarUrl: 'https://avatar.png',
      createdAt: new Date(),
    });

    const jwtCallback = authConfig.callbacks?.jwt;
    expect(jwtCallback).toBeDefined();

    const initialToken: JWT = {};
    const result = await jwtCallback!({
      token: initialToken,
      user: { id: 'u1', name: 'mockoctocat', image: 'https://avatar.png' },
      account: { provider: 'github', providerAccountId: '12345', type: 'oauth' } as Account,
      profile: { id: 12345, login: 'mockoctocat', avatar_url: 'https://avatar.png' } as unknown as Profile,
    } as unknown as JwtParam);

    expect(syncSpy).toHaveBeenCalledWith({
      githubId: '12345',
      username: 'mockoctocat',
      avatarUrl: 'https://avatar.png',
    });

    expect(result?.userId).toBe('db_user_123');
    expect(result?.githubId).toBe('12345');
    expect(result?.username).toBe('mockoctocat');
  });

  it('session callback enriches session.user with token data', async () => {
    const sessionCallback = authConfig.callbacks?.session;
    expect(sessionCallback).toBeDefined();

    const mockSession: Session = {
      user: { id: 'old', name: 'Old Name', email: 'test@example.com' },
      expires: new Date().toISOString(),
    };

    const mockToken: JWT = {
      userId: 'db_user_123',
      githubId: '12345',
      username: 'mockoctocat',
      avatarUrl: 'https://avatar.png',
    };

    const result = await sessionCallback!({
      session: mockSession,
      token: mockToken,
      user: mockSession.user,
    } as unknown as SessionParam);

    expect(result?.user?.id).toBe('db_user_123');
    expect((result?.user as unknown as { username?: string })?.username).toBe('mockoctocat');
    expect(result?.user?.image).toBe('https://avatar.png');
  });
});
