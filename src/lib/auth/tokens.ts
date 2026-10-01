import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { AccessToken } from '@prisma/client';
import {
  createAccessTokenSchema,
  type CreateAccessTokenInput,
  type TokenScope,
} from '@/lib/validations/token';
import { AuthorizationError } from '@/lib/admin/contexts';

export const TOKEN_PREFIX = 'ccs_';

/**
 * Generates a high-entropy Personal Access Token with prefix `ccs_`.
 * 32 random bytes = 64 hex characters -> 68 total characters.
 */
export function generateAccessToken(): string {
  const entropy = crypto.randomBytes(32).toString('hex');
  return `${TOKEN_PREFIX}${entropy}`;
}

/**
 * Computes SHA-256 hash of a raw token according to ADR-0010.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Validates the syntactic format of a Personal Access Token.
 */
export function isValidTokenFormat(rawToken: string): boolean {
  if (typeof rawToken !== 'string') return false;
  return rawToken.startsWith(TOKEN_PREFIX) && rawToken.length === 68;
}

export type TokenValidationUser = {
  id: string;
  githubId: string;
  username: string;
  avatarUrl: string | null;
};

export type TokenValidationResult =
  | {
      valid: true;
      token: AccessToken;
      user: TokenValidationUser;
    }
  | {
      valid: false;
      error:
        | 'invalid_format'
        | 'token_not_found'
        | 'token_revoked'
        | 'token_expired'
        | 'insufficient_scope';
      message: string;
      token?: AccessToken;
      user?: TokenValidationUser;
    };

/**
 * Validates a raw Access Token against Postgres:
 * 1. Checks format & computes SHA-256 hash
 * 2. Fetches matching AccessToken by tokenHash
 * 3. Validates not revoked (revokedAt is null)
 * 4. Validates not expired (expiresAt is null or in future)
 * 5. Validates required scope
 * 6. Updates lastUsedAt on success
 */
export async function validateAccessToken(
  rawToken: string,
  requiredScope?: TokenScope | string
): Promise<TokenValidationResult> {
  if (!rawToken || typeof rawToken !== 'string') {
    return {
      valid: false,
      error: 'invalid_format',
      message: 'Token no provisto o formato inválido',
    };
  }

  const tokenHash = hashToken(rawToken);

  const tokenRecord = await prisma.accessToken.findUnique({
    where: { tokenHash },
    include: {
      owner: {
        select: {
          id: true,
          githubId: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!tokenRecord) {
    return {
      valid: false,
      error: 'token_not_found',
      message: 'Token de acceso no encontrado o inválido',
    };
  }

  if (tokenRecord.revokedAt !== null) {
    return {
      valid: false,
      error: 'token_revoked',
      message: 'El token de acceso ha sido revocado',
      token: tokenRecord,
      user: tokenRecord.owner,
    };
  }

  if (tokenRecord.expiresAt !== null && tokenRecord.expiresAt < new Date()) {
    return {
      valid: false,
      error: 'token_expired',
      message: 'El token de acceso ha expirado',
      token: tokenRecord,
      user: tokenRecord.owner,
    };
  }

  if (requiredScope && !tokenRecord.scopes.includes(requiredScope)) {
    return {
      valid: false,
      error: 'insufficient_scope',
      message: `El token no posee el permiso requerido '${requiredScope}'`,
      token: tokenRecord,
      user: tokenRecord.owner,
    };
  }

  // Update lastUsedAt
  await prisma.accessToken.update({
    where: { id: tokenRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    token: tokenRecord,
    user: tokenRecord.owner,
  };
}

/**
 * Retrieves all access tokens for a given user.
 */
export async function getUserAccessTokens(ownerId: string): Promise<AccessToken[]> {
  return await prisma.accessToken.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Creates a new access token for a user.
 * Returns the created record along with the raw token (displayed only once).
 */
export async function createAccessToken(
  ownerId: string,
  input: CreateAccessTokenInput
): Promise<{ accessToken: AccessToken; rawToken: string }> {
  const data = createAccessTokenSchema.parse(input);
  const rawToken = generateAccessToken();
  const tokenHash = hashToken(rawToken);

  const accessToken = await prisma.accessToken.create({
    data: {
      ownerId,
      tokenHash,
      label: data.label,
      scopes: data.scopes,
      expiresAt: data.expiresAt,
    },
  });

  return {
    accessToken,
    rawToken,
  };
}

/**
 * Revokes an access token owned by the user.
 */
export async function revokeAccessToken(id: string, ownerId: string): Promise<AccessToken> {
  const existing = await prisma.accessToken.findFirst({
    where: { id, ownerId },
  });

  if (!existing) {
    throw new AuthorizationError('Token no encontrado o no pertenece a tu usuario');
  }

  return await prisma.accessToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}
