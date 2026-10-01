import { describe, it, expect } from 'vitest';
import { createAuthJWT, verifyAuthJWT } from '../jwt';

describe('Auth JWT utilities', () => {
  const mockPayload = {
    userId: 'user_cuid_test_123',
    githubId: '99887766',
    username: 'testdeveloper',
    avatarUrl: 'https://avatars.githubusercontent.com/u/99887766',
  };

  it('creates and verifies a valid JWT token', async () => {
    const token = await createAuthJWT(mockPayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const verified = await verifyAuthJWT(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(mockPayload.userId);
    expect(verified?.githubId).toBe(mockPayload.githubId);
    expect(verified?.username).toBe(mockPayload.username);
  });

  it('fails verification when token is tampered or invalid secret is used', async () => {
    const token = await createAuthJWT(mockPayload);
    const tampered = token.slice(0, -5) + 'abcde';

    const verified = await verifyAuthJWT(tampered);
    expect(verified).toBeNull();

    const verifiedWrongSecret = await verifyAuthJWT(token, {
      secret: 'a-completely-different-and-wrong-secret-key-12345',
    });
    expect(verifiedWrongSecret).toBeNull();
  });

  it('handles expired tokens correctly', async () => {
    // Token with maxAge of 0 or -1 (already expired)
    const token = await createAuthJWT(mockPayload, { maxAge: -10 });
    const verified = await verifyAuthJWT(token);
    expect(verified).toBeNull();
  });
});
