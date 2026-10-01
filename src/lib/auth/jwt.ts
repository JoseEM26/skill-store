import { encode, decode } from 'next-auth/jwt';
import { validateEnv } from '@/lib/env';

export interface AuthJWTPayload {
  userId: string;
  githubId: string;
  username: string;
  avatarUrl?: string | null;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export async function createAuthJWT(
  payload: AuthJWTPayload,
  options?: { maxAge?: number; secret?: string }
): Promise<string> {
  const env = validateEnv();
  const secret = options?.secret || env.AUTH_SECRET;
  const maxAge = options?.maxAge ?? env.AUTH_SESSION_MAX_AGE;

  return await encode({
    token: payload,
    secret,
    maxAge,
    salt: 'authjs.session-token',
  });
}

export async function verifyAuthJWT(
  tokenString: string,
  options?: { secret?: string }
): Promise<AuthJWTPayload | null> {
  const env = validateEnv();
  const secret = options?.secret || env.AUTH_SECRET;

  try {
    const decoded = (await decode({
      token: tokenString,
      secret,
      salt: 'authjs.session-token',
    })) as AuthJWTPayload | null;

    if (!decoded) {
      return null;
    }

    // Explicitly verify expiration if exp is present
    if (typeof decoded.exp === 'number') {
      const currentTimestampInSeconds = Math.floor(Date.now() / 1000);
      if (decoded.exp <= currentTimestampInSeconds) {
        return null;
      }
    }

    return decoded;
  } catch {
    return null;
  }
}
