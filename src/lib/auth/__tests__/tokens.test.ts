import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  generateAccessToken,
  hashToken,
  isValidTokenFormat,
  validateAccessToken,
  createAccessToken,
  revokeAccessToken,
  getUserAccessTokens,
} from '../tokens';
import { AuthorizationError } from '@/lib/admin/contexts';

describe('MCP Access Tokens Service', () => {
  let userA: { id: string; githubId: string };
  let userB: { id: string; githubId: string };

  beforeEach(async () => {
    userA = await prisma.user.create({
      data: {
        githubId: `test-tok-user-a-${Date.now()}`,
        username: 'userA_tok',
      },
    });

    userB = await prisma.user.create({
      data: {
        githubId: `test-tok-user-b-${Date.now()}`,
        username: 'userB_tok',
      },
    });
  });

  afterEach(async () => {
    if (userA?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: userA.id } });
      await prisma.user.deleteMany({ where: { id: userA.id } });
    }
    if (userB?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: userB.id } });
      await prisma.user.deleteMany({ where: { id: userB.id } });
    }
  });

  describe('Cryptographic helpers', () => {
    it('generates token with ccs_ prefix and 68 total length (256 bits entropy)', () => {
      const token1 = generateAccessToken();
      const token2 = generateAccessToken();

      expect(token1.startsWith('ccs_')).toBe(true);
      expect(token1.length).toBe(68);
      expect(token1).not.toBe(token2);
      expect(isValidTokenFormat(token1)).toBe(true);
      expect(isValidTokenFormat('invalid_token')).toBe(false);
    });

    it('hashes token using SHA-256 (64 hex characters) deterministically', () => {
      const raw = 'ccs_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const hash1 = hashToken(raw);
      const hash2 = hashToken(raw);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
    });
  });

  describe('createAccessToken & getUserAccessTokens', () => {
    it('creates token and returns rawToken exactly once without storing raw in DB', async () => {
      const result = await createAccessToken(userA.id, {
        label: 'Cursor Agent Token',
        scopes: ['read', 'write'],
      });

      expect(result.rawToken.startsWith('ccs_')).toBe(true);
      expect(result.accessToken.id).toBeDefined();
      expect(result.accessToken.ownerId).toBe(userA.id);
      expect(result.accessToken.label).toBe('Cursor Agent Token');
      expect(result.accessToken.scopes).toEqual(['read', 'write']);
      expect(result.accessToken.revokedAt).toBeNull();
      expect(result.accessToken.tokenHash).toBe(hashToken(result.rawToken));

      // Verify DB record
      const dbRecord = await prisma.accessToken.findUnique({
        where: { id: result.accessToken.id },
      });
      expect(dbRecord?.tokenHash).toBe(result.accessToken.tokenHash);
      // Raw token is NEVER stored in database
      expect(JSON.stringify(dbRecord)).not.toContain(result.rawToken);
    });

    it('lists all tokens belonging to the owner', async () => {
      await createAccessToken(userA.id, { label: 'Token 1', scopes: ['read'] });
      await createAccessToken(userA.id, { label: 'Token 2', scopes: ['read', 'write'] });
      await createAccessToken(userB.id, { label: 'Token User B', scopes: ['delete'] });

      const tokensA = await getUserAccessTokens(userA.id);
      expect(tokensA.length).toBe(2);
      expect(tokensA.map((t) => t.label)).toContain('Token 1');
      expect(tokensA.map((t) => t.label)).toContain('Token 2');

      const tokensB = await getUserAccessTokens(userB.id);
      expect(tokensB.length).toBe(1);
      expect(tokensB[0].label).toBe('Token User B');
    });
  });

  describe('validateAccessToken (Authenticity, Expiration, Revocation & Scopes)', () => {
    it('validates active token and updates lastUsedAt', async () => {
      const { rawToken } = await createAccessToken(userA.id, {
        label: 'Valid Token',
        scopes: ['read', 'write'],
      });

      const validation = await validateAccessToken(rawToken, 'read');
      expect(validation.valid).toBe(true);
      if (validation.valid) {
        expect(validation.user.id).toBe(userA.id);
        expect(validation.user.username).toBe('userA_tok');
        expect(validation.token.label).toBe('Valid Token');
      }

      // Verify lastUsedAt was recorded
      const updated = await prisma.accessToken.findFirst({
        where: { ownerId: userA.id },
      });
      expect(updated?.lastUsedAt).not.toBeNull();
    });

    it('rejects invalid or non-existent token', async () => {
      const invalidRes = await validateAccessToken('ccs_nonexistenttoken1234567890123456789012345678901234567890123456789012');
      expect(invalidRes.valid).toBe(false);
      if (!invalidRes.valid) {
        expect(invalidRes.error).toBe('token_not_found');
      }

      const formatRes = await validateAccessToken('');
      expect(formatRes.valid).toBe(false);
      if (!formatRes.valid) {
        expect(formatRes.error).toBe('invalid_format');
      }
    });

    it('rejects expired token', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const { rawToken } = await createAccessToken(userA.id, {
        label: 'Expired Token',
        scopes: ['read'],
        expiresAt: pastDate,
      });

      const validation = await validateAccessToken(rawToken);
      expect(validation.valid).toBe(false);
      if (!validation.valid) {
        expect(validation.error).toBe('token_expired');
      }
    });

    it('rejects token when scope is insufficient', async () => {
      const { rawToken } = await createAccessToken(userA.id, {
        label: 'Read-only Token',
        scopes: ['read'],
      });

      // Reading is allowed
      const readVal = await validateAccessToken(rawToken, 'read');
      expect(readVal.valid).toBe(true);

      // Writing is forbidden
      const writeVal = await validateAccessToken(rawToken, 'write');
      expect(writeVal.valid).toBe(false);
      if (!writeVal.valid) {
        expect(writeVal.error).toBe('insufficient_scope');
      }

      // Deleting is forbidden
      const deleteVal = await validateAccessToken(rawToken, 'delete');
      expect(deleteVal.valid).toBe(false);
      if (!deleteVal.valid) {
        expect(deleteVal.error).toBe('insufficient_scope');
      }
    });

    it('immediately blocks on subsequent call after revocation (non-cached)', async () => {
      const { accessToken, rawToken } = await createAccessToken(userA.id, {
        label: 'Token To Revoke',
        scopes: ['read', 'write'],
      });

      // Call 1: valid
      const call1 = await validateAccessToken(rawToken);
      expect(call1.valid).toBe(true);

      // Action: Revoke token
      await revokeAccessToken(accessToken.id, userA.id);

      // Call 2: IMMEDIATELY rejected
      const call2 = await validateAccessToken(rawToken);
      expect(call2.valid).toBe(false);
      if (!call2.valid) {
        expect(call2.error).toBe('token_revoked');
      }
    });
  });

  describe('Revocation security & isolation', () => {
    it('prevents user A from revoking user B token', async () => {
      const { accessToken: tokenB } = await createAccessToken(userB.id, {
        label: 'Token User B',
        scopes: ['read'],
      });

      await expect(revokeAccessToken(tokenB.id, userA.id)).rejects.toThrow(AuthorizationError);

      // Verify token B is still active
      const record = await prisma.accessToken.findUnique({
        where: { id: tokenB.id },
      });
      expect(record?.revokedAt).toBeNull();
    });
  });
});
