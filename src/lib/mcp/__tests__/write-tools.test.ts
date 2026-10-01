import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  handleCreateContext,
  handleUpdateContext,
  handleDeleteContext,
  handlePublishSkill,
  handleDeleteSkill,
} from '../tools';
import { createAccessToken } from '@/lib/auth/tokens';

describe('MCP Write Tools & Security Isolation', () => {
  let userA: { id: string; githubId: string; username: string };
  let userB: { id: string; githubId: string; username: string };
  let readTokenA: string;
  let writeTokenA: string;
  let deleteTokenA: string;
  let writeTokenB: string;

  beforeEach(async () => {
    userA = await prisma.user.create({
      data: {
        githubId: `test-mcp-write-a-${Date.now()}`,
        username: `mcp_write_a_${Date.now()}`,
      },
    });

    userB = await prisma.user.create({
      data: {
        githubId: `test-mcp-write-b-${Date.now()}`,
        username: `mcp_write_b_${Date.now()}`,
      },
    });

    const resReadA = await createAccessToken(userA.id, {
      label: 'Read Token User A',
      scopes: ['read'],
    });
    readTokenA = resReadA.rawToken;

    const resWriteA = await createAccessToken(userA.id, {
      label: 'Write Token User A',
      scopes: ['read', 'write'],
    });
    writeTokenA = resWriteA.rawToken;

    const resDeleteA = await createAccessToken(userA.id, {
      label: 'Delete Token User A',
      scopes: ['read', 'write', 'delete'],
    });
    deleteTokenA = resDeleteA.rawToken;

    const resWriteB = await createAccessToken(userB.id, {
      label: 'Write Token User B',
      scopes: ['read', 'write'],
    });
    writeTokenB = resWriteB.rawToken;
  });

  afterEach(async () => {
    if (userA?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: userA.id } });
      await prisma.context.deleteMany({ where: { ownerId: userA.id } });
      await prisma.skillVersion.deleteMany({ where: { skill: { ownerId: userA.id } } });
      await prisma.skill.deleteMany({ where: { ownerId: userA.id } });
      await prisma.user.deleteMany({ where: { id: userA.id } });
    }
    if (userB?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: userB.id } });
      await prisma.context.deleteMany({ where: { ownerId: userB.id } });
      await prisma.skillVersion.deleteMany({ where: { skill: { ownerId: userB.id } } });
      await prisma.skill.deleteMany({ where: { ownerId: userB.id } });
      await prisma.user.deleteMany({ where: { id: userB.id } });
    }
  });

  describe('create_context', () => {
    it('creates a private idea by default with owner derived from token', async () => {
      const res = await handleCreateContext({
        token: writeTokenA,
        type: 'idea',
        title: 'Nueva Idea Privada',
        body: 'Detalle de la idea',
        tags: ['arquitectura', 'mcp'],
      });

      expect(res.id).toBeDefined();
      expect(res.type).toBe('idea');
      expect(res.title).toBe('Nueva Idea Privada');
      expect(res.isPublic).toBe(false);
      expect(res.owner).toBe(userA.username);

      const inDb = await prisma.context.findUnique({ where: { id: res.id } });
      expect(inDb?.ownerId).toBe(userA.id);
      expect(inDb?.isPublic).toBe(false);
    });

    it('ignores client-supplied ownerId and strictly binds to token owner', async () => {
      const payload: Record<string, unknown> = {
        token: writeTokenA,
        type: 'idea',
        title: 'Idea con ownerId adulterado',
        body: 'Intento de spoofing',
        ownerId: userB.id,
      };

      const res = await handleCreateContext(payload as unknown as Parameters<typeof handleCreateContext>[0]);

      expect(res.id).toBeDefined();
      const inDb = await prisma.context.findUnique({ where: { id: res.id } });
      expect(inDb?.ownerId).toBe(userA.id);
      expect(inDb?.ownerId).not.toBe(userB.id);
    });

    it('creates an external reference with forced isPublic: true and valid link', async () => {
      const res = await handleCreateContext({
        token: writeTokenA,
        type: 'external_reference',
        title: 'Documentación Oficial',
        link: 'https://modelcontextprotocol.io/introduction',
        isPublic: false, // Must be forced to true
      });

      expect(res.id).toBeDefined();
      expect(res.type).toBe('external_reference');
      expect(res.isPublic).toBe(true);

      const inDb = await prisma.context.findUnique({ where: { id: res.id } });
      expect(inDb?.isPublic).toBe(true);
      expect(inDb?.link).toBe('https://modelcontextprotocol.io/introduction');
    });

    it('rejects external reference missing link or invalid URL', async () => {
      const missingLinkPayload: Record<string, unknown> = {
        token: writeTokenA,
        type: 'external_reference',
        title: 'Sin link',
      };
      await expect(
        handleCreateContext(missingLinkPayload as unknown as Parameters<typeof handleCreateContext>[0])
      ).rejects.toThrow();

      const invalidLinkPayload: Record<string, unknown> = {
        token: writeTokenA,
        type: 'external_reference',
        title: 'Link inválido',
        link: 'not-a-url',
      };
      await expect(
        handleCreateContext(invalidLinkPayload as unknown as Parameters<typeof handleCreateContext>[0])
      ).rejects.toThrow();
    });

    it('rejects create_context when token has only read scope', async () => {
      await expect(
        handleCreateContext({
          token: readTokenA,
          type: 'idea',
          title: 'Idea con token read',
        })
      ).rejects.toThrow('El token no posee el permiso requerido \'write\'');
    });
  });

  describe('update_context', () => {
    it('updates context owned by the token holder', async () => {
      const context = await prisma.context.create({
        data: {
          type: 'idea',
          title: 'Original Title',
          body: 'Original Body',
          ownerId: userA.id,
          isPublic: false,
        },
      });

      const updated = await handleUpdateContext({
        token: writeTokenA,
        id: context.id,
        title: 'Updated Title',
        body: 'Updated Body',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.body).toBe('Updated Body');

      const inDb = await prisma.context.findUnique({ where: { id: context.id } });
      expect(inDb?.title).toBe('Updated Title');
    });

    it('rejects update on another user\'s context (isolation between User A and User B)', async () => {
      const contextB = await prisma.context.create({
        data: {
          type: 'idea',
          title: 'User B Idea',
          body: 'Private secret',
          ownerId: userB.id,
          isPublic: false,
        },
      });

      await expect(
        handleUpdateContext({
          token: writeTokenA,
          id: contextB.id,
          title: 'Tampered by User A',
        })
      ).rejects.toThrow('Recurso no encontrado o no pertenece a tu usuario');

      const inDb = await prisma.context.findUnique({ where: { id: contextB.id } });
      expect(inDb?.title).toBe('User B Idea'); // Untouched
    });
  });

  describe('delete_context', () => {
    it('deletes context owned by token holder when token has delete scope', async () => {
      const context = await prisma.context.create({
        data: {
          type: 'idea',
          title: 'Idea To Delete',
          ownerId: userA.id,
        },
      });

      const res = await handleDeleteContext({
        token: deleteTokenA,
        id: context.id,
      });

      expect(res.success).toBe(true);
      const inDb = await prisma.context.findUnique({ where: { id: context.id } });
      expect(inDb).toBeNull();
    });

    it('rejects delete_context when token has write scope but NOT delete scope', async () => {
      const context = await prisma.context.create({
        data: {
          type: 'idea',
          title: 'Protected Idea',
          ownerId: userA.id,
        },
      });

      await expect(
        handleDeleteContext({
          token: writeTokenA,
          id: context.id,
        })
      ).rejects.toThrow('El token no posee el permiso requerido \'delete\'');

      const inDb = await prisma.context.findUnique({ where: { id: context.id } });
      expect(inDb).not.toBeNull();
    });

    it('rejects delete on another user\'s context', async () => {
      const contextB = await prisma.context.create({
        data: {
          type: 'idea',
          title: 'User B Context',
          ownerId: userB.id,
        },
      });

      await expect(
        handleDeleteContext({
          token: deleteTokenA,
          id: contextB.id,
        })
      ).rejects.toThrow('Recurso no encontrado o no pertenece a tu usuario');

      const inDb = await prisma.context.findUnique({ where: { id: contextB.id } });
      expect(inDb).not.toBeNull();
    });
  });

  describe('publish_skill', () => {
    it('publishes a new skill assigned to token owner', async () => {
      const res = await handlePublishSkill({
        token: writeTokenA,
        slug: 'my-new-skill',
        name: 'My New Skill',
        description: 'A test skill for MCP',
        repositoryUrl: 'https://github.com/test/my-new-skill',
      });

      expect(res.id).toBeDefined();
      expect(res.slug).toBe('my-new-skill');
      expect(res.owner).toBe(userA.username);
      expect(res.downloadsCount).toBe(0);
      expect(res.installsCount).toBe(0);

      const inDb = await prisma.skill.findUnique({ where: { id: res.id } });
      expect(inDb?.ownerId).toBe(userA.id);
    });

    it('rejects publishing a skill with duplicate slug for the same owner', async () => {
      await handlePublishSkill({
        token: writeTokenA,
        slug: 'unique-slug-test',
        name: 'First Skill',
      });

      await expect(
        handlePublishSkill({
          token: writeTokenA,
          slug: 'unique-slug-test',
          name: 'Duplicate Skill',
        })
      ).rejects.toThrow('Ya tienes una skill registrada con el slug "unique-slug-test"');
    });

    it('allows different users to have the same slug', async () => {
      const skillA = await handlePublishSkill({
        token: writeTokenA,
        slug: 'shared-name-slug',
        name: 'Skill A',
      });

      const skillB = await handlePublishSkill({
        token: writeTokenB,
        slug: 'shared-name-slug',
        name: 'Skill B',
      });

      expect(skillA.id).not.toBe(skillB.id);
      expect(skillA.owner).toBe(userA.username);
      expect(skillB.owner).toBe(userB.username);
    });

    it('updates an existing skill when id is provided', async () => {
      const created = await handlePublishSkill({
        token: writeTokenA,
        slug: 'skill-to-edit',
        name: 'Before Edit',
      });

      const updated = await handlePublishSkill({
        token: writeTokenA,
        id: created.id,
        slug: 'skill-to-edit',
        name: 'After Edit',
        description: 'Updated description',
      });

      expect(updated.name).toBe('After Edit');
      expect(updated.description).toBe('Updated description');
    });
  });

  describe('delete_skill', () => {
    it('deletes skill by slug or id with delete scope', async () => {
      const skill = await prisma.skill.create({
        data: {
          slug: 'skill-to-delete',
          name: 'Skill To Delete',
          ownerId: userA.id,
        },
      });

      const res = await handleDeleteSkill({
        token: deleteTokenA,
        slug: 'skill-to-delete',
      });

      expect(res.success).toBe(true);
      const inDb = await prisma.skill.findUnique({ where: { id: skill.id } });
      expect(inDb).toBeNull();
    });

    it('rejects delete_skill when token lacks delete scope', async () => {
      const skill = await prisma.skill.create({
        data: {
          slug: 'protected-skill',
          name: 'Protected Skill',
          ownerId: userA.id,
        },
      });

      await expect(
        handleDeleteSkill({
          token: writeTokenA,
          id: skill.id,
        })
      ).rejects.toThrow('El token no posee el permiso requerido \'delete\'');

      const inDb = await prisma.skill.findUnique({ where: { id: skill.id } });
      expect(inDb).not.toBeNull();
    });

    it('rejects delete on another user\'s skill', async () => {
      const skillB = await prisma.skill.create({
        data: {
          slug: 'user-b-skill',
          name: 'User B Skill',
          ownerId: userB.id,
        },
      });

      await expect(
        handleDeleteSkill({
          token: deleteTokenA,
          slug: 'user-b-skill',
        })
      ).rejects.toThrow('Skill no encontrada o no pertenece a tu usuario');

      const inDb = await prisma.skill.findUnique({ where: { id: skillB.id } });
      expect(inDb).not.toBeNull();
    });
  });

  describe('Archived Resources Protection', () => {
    it('rejects update_context on archived context', async () => {
      const archivedCtx = await prisma.context.create({
        data: {
          type: 'idea',
          title: 'Archived Idea',
          ownerId: userA.id,
          isArchived: true,
          isPublic: false,
        },
      });

      await expect(
        handleUpdateContext({
          token: writeTokenA,
          id: archivedCtx.id,
          title: 'Should Fail',
        })
      ).rejects.toThrow('El contexto está archivado y no admite modificaciones');
    });

    it('rejects delete_context on archived context', async () => {
      const archivedCtx = await prisma.context.create({
        data: {
          type: 'idea',
          title: 'Archived Idea',
          ownerId: userA.id,
          isArchived: true,
          isPublic: false,
        },
      });

      await expect(
        handleDeleteContext({
          token: deleteTokenA,
          id: archivedCtx.id,
        })
      ).rejects.toThrow('El contexto está archivado y no admite eliminación');
    });

    it('rejects publish_skill update on archived skill', async () => {
      const archivedSkill = await prisma.skill.create({
        data: {
          slug: 'archived-skill-mcp',
          name: 'Archived Skill',
          ownerId: userA.id,
          isArchived: true,
        },
      });

      await expect(
        handlePublishSkill({
          token: writeTokenA,
          id: archivedSkill.id,
          slug: 'archived-skill-mcp',
          name: 'Should Fail',
        })
      ).rejects.toThrow('La skill está archivada y no admite modificaciones');
    });

    it('rejects delete_skill on archived skill', async () => {
      const archivedSkill = await prisma.skill.create({
        data: {
          slug: 'archived-skill-mcp-del',
          name: 'Archived Skill',
          ownerId: userA.id,
          isArchived: true,
        },
      });

      await expect(
        handleDeleteSkill({
          token: deleteTokenA,
          id: archivedSkill.id,
        })
      ).rejects.toThrow('La skill está archivada y no admite eliminación');
    });
  });
});
