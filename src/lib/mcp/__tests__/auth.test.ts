import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { withAuthenticatedTool } from '../auth';
import { createAccessToken, revokeAccessToken } from '@/lib/auth/tokens';

describe('withAuthenticatedTool Wrapper', () => {
  let user: { id: string; githubId: string; username: string };
  let readToken: string;
  let writeToken: string;
  let deleteToken: string;
  let writeTokenId: string;

  beforeEach(async () => {
    user = await prisma.user.create({
      data: {
        githubId: `test-auth-wrapper-${Date.now()}`,
        username: `auth_wrapper_${Date.now()}`,
      },
    });

    const resRead = await createAccessToken(user.id, {
      label: 'Read Token',
      scopes: ['read'],
    });
    readToken = resRead.rawToken;

    const resWrite = await createAccessToken(user.id, {
      label: 'Write Token',
      scopes: ['read', 'write'],
    });
    writeToken = resWrite.rawToken;
    writeTokenId = resWrite.accessToken.id;

    const resDelete = await createAccessToken(user.id, {
      label: 'Delete Token',
      scopes: ['read', 'write', 'delete'],
    });
    deleteToken = resDelete.rawToken;
  });

  afterEach(async () => {
    if (user?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });

  it('rejects calls without token', async () => {
    const wrapped = withAuthenticatedTool('write', async (_args, ctx) => {
      return { success: true, ownerId: ctx.ownerId };
    });

    await expect(wrapped({})).rejects.toThrow('Token de acceso requerido con scope \'write\'');
  });

  it('rejects calls with non-existent or invalid token', async () => {
    const wrapped = withAuthenticatedTool('write', async (_args, ctx) => {
      return { success: true, ownerId: ctx.ownerId };
    });

    await expect(wrapped({ token: 'ccs_invalidtoken' })).rejects.toThrow('Autenticación fallida');
  });

  it('rejects calls with revoked token', async () => {
    await revokeAccessToken(writeTokenId, user.id);

    const wrapped = withAuthenticatedTool('write', async (_args, ctx) => {
      return { success: true, ownerId: ctx.ownerId };
    });

    await expect(wrapped({ token: writeToken })).rejects.toThrow('El token de acceso ha sido revocado');
  });

  it('rejects calls with expired token', async () => {
    const rawRes = await createAccessToken(user.id, {
      label: 'Expiring Token',
      scopes: ['write'],
      expiresAt: new Date(Date.now() + 100000),
    });
    await prisma.accessToken.update({
      where: { id: rawRes.accessToken.id },
      data: { expiresAt: new Date(Date.now() - 10000) },
    });

    const wrapped = withAuthenticatedTool('write', async (_args, ctx) => {
      return { success: true, ownerId: ctx.ownerId };
    });

    await expect(wrapped({ token: rawRes.rawToken })).rejects.toThrow('El token de acceso ha expirado');
  });

  it('rejects calls with insufficient scope (e.g. read token calling write tool)', async () => {
    const wrappedWrite = withAuthenticatedTool('write', async (_args, ctx) => {
      return { success: true, ownerId: ctx.ownerId };
    });

    await expect(wrappedWrite({ token: readToken })).rejects.toThrow('El token no posee el permiso requerido \'write\'');

    const wrappedDelete = withAuthenticatedTool('delete', async (_args, ctx) => {
      return { success: true, ownerId: ctx.ownerId };
    });

    await expect(wrappedDelete({ token: writeToken })).rejects.toThrow('El token no posee el permiso requerido \'delete\'');
  });

  it('authorizes successfully and injects verified ownerId and user context via token in args', async () => {
    const wrapped = withAuthenticatedTool('write', async (args: { title: string; token?: string }, ctx) => {
      return { processed: true, title: args.title, ownerId: ctx.ownerId, username: ctx.user.username };
    });

    const result = await wrapped({ title: 'My Note', token: writeToken });
    expect(result.processed).toBe(true);
    expect(result.title).toBe('My Note');
    expect(result.ownerId).toBe(user.id);
    expect(result.username).toBe(user.username);
  });

  it('authorizes successfully via Bearer token in header', async () => {
    const wrapped = withAuthenticatedTool('delete', async (_args, ctx) => {
      return { deleted: true, ownerId: ctx.ownerId };
    });

    const result = await wrapped({}, deleteToken);
    expect(result.deleted).toBe(true);
    expect(result.ownerId).toBe(user.id);
  });
});
