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

    it('updates name and description of an existing skill when id is provided', async () => {
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

    it('publishes a skill with explicit isPublic: false and isPaused: true', async () => {
      const res = await handlePublishSkill({
        token: writeTokenA,
        slug: 'private-paused-skill',
        name: 'Private Paused Skill',
        isPublic: false,
        isPaused: true,
      });

      expect(res.id).toBeDefined();
      expect(res.isPublic).toBe(false);
      expect(res.isPaused).toBe(true);

      const inDb = await prisma.skill.findUnique({ where: { id: res.id } });
      expect(inDb?.isPublic).toBe(false);
      expect(inDb?.isPaused).toBe(true);
      expect(inDb?.ownerId).toBe(userA.id);
    });

    it('defaults to isPublic: false and isPaused: false when omitted upon creation', async () => {
      const res = await handlePublishSkill({
        token: writeTokenA,
        slug: 'default-visibility-skill',
        name: 'Default Visibility Skill',
      });

      expect(res.isPublic).toBe(false);
      expect(res.isPaused).toBe(false);

      const inDb = await prisma.skill.findUnique({ where: { id: res.id } });
      expect(inDb?.isPublic).toBe(false);
      expect(inDb?.isPaused).toBe(false);
    });

    it('forces isPublic: false on creation even if client explicitly sends isPublic: true', async () => {
      const res = await handlePublishSkill({
        token: writeTokenA,
        slug: 'force-private-skill',
        name: 'Force Private Skill',
        isPublic: true,
      });

      expect(res.id).toBeDefined();
      expect(res.isPublic).toBe(false);

      const inDb = await prisma.skill.findUnique({ where: { id: res.id } });
      expect(inDb?.isPublic).toBe(false);
    });

    it('updates visibility to isPublic: true on an existing skill when id is provided', async () => {
      const created = await handlePublishSkill({
        token: writeTokenA,
        slug: 'existing-skill-to-public',
        name: 'Existing Skill To Public',
      });

      expect(created.isPublic).toBe(false);

      const updated = await handlePublishSkill({
        token: writeTokenA,
        id: created.id,
        slug: 'existing-skill-to-public',
        name: 'Existing Skill Made Public',
        isPublic: true,
      });

      expect(updated.isPublic).toBe(true);

      const inDb = await prisma.skill.findUnique({ where: { id: created.id } });
      expect(inDb?.isPublic).toBe(true);
    });

    it('updates visibility and paused state on an existing skill owned by token holder', async () => {
      const created = await prisma.skill.create({
        data: {
          slug: 'toggle-skill',
          name: 'Toggle Skill',
          isPublic: true,
          isPaused: false,
          ownerId: userA.id,
        },
      });

      const updated = await handlePublishSkill({
        token: writeTokenA,
        id: created.id,
        slug: 'toggle-skill',
        name: 'Toggle Skill Updated',
        isPublic: false,
        isPaused: true,
      });

      expect(updated.isPublic).toBe(false);
      expect(updated.isPaused).toBe(true);

      const inDb = await prisma.skill.findUnique({ where: { id: created.id } });
      expect(inDb?.isPublic).toBe(false);
      expect(inDb?.isPaused).toBe(true);
    });

    it('rejects updating visibility or paused status of another user\'s skill (ownership isolation)', async () => {
      const skillA = await prisma.skill.create({
        data: {
          slug: 'skill-owner-a',
          name: 'Skill of User A',
          isPublic: true,
          isPaused: false,
          ownerId: userA.id,
        },
      });

      // User B attempts to change visibility/paused state of User A's skill
      await expect(
        handlePublishSkill({
          token: writeTokenB,
          id: skillA.id,
          slug: 'skill-owner-a',
          name: 'Tampered Name',
          isPublic: false,
          isPaused: true,
        })
      ).rejects.toThrow('Skill no encontrada o no pertenece a tu usuario');

      // Verify skill in DB remains unchanged
      const inDb = await prisma.skill.findUnique({ where: { id: skillA.id } });
      expect(inDb?.isPublic).toBe(true);
      expect(inDb?.isPaused).toBe(false);
      expect(inDb?.name).toBe('Skill of User A');
    });

    const VALID_SKILL_CONTENT = `---
name: strict-format-skill
description: Descripción desde el frontmatter YAML
license: Apache-2.0
compatibility: "Claude Code, Cursor >= 0.40"
metadata:
  version: "1.2.0"
  author: "alice"
---

## 1. Propósito y Cuándo Usar
Propósito y casos de uso.

## 2. Flujo de Trabajo (Workflow)
Flujo paso a paso.

## 3. Reglas y Restricciones (Criterios de Diseño)
Reglas estrictas.

## 4. Árbol de Decisión (Si aplica)
No aplica.

## 5. Ejemplos Ejecutables
Ejemplos prácticos.

## 6. Manejo de Errores y Casos Excepcionales
Manejo de errores.
`;

    const VALID_SKILL_CONTENT_V2 = `---
name: strict-format-skill-updated
description: Descripción actualizada desde frontmatter
license: BSD-3-Clause
compatibility: "Claude Code"
metadata:
  version: "2.0.0"
  author: "alice"
---

## 1. Propósito y Cuándo Usar
Propósito v2.

## 2. Flujo de Trabajo (Workflow)
Flujo v2.

## 3. Reglas y Restricciones (Criterios de Diseño)
Reglas v2.

## 4. Árbol de Decisión (Si aplica)
No aplica.

## 5. Ejemplos Ejecutables
Ejemplos v2.

## 6. Manejo de Errores y Casos Excepcionales
Errores v2.
`;

    const INVALID_SEMVER_CONTENT = `---
name: invalid-semver-skill
description: Invalid SemVer description
metadata:
  version: not-a-semver
---

# Title
`;

    const INVALID_MISSING_SECTION_CONTENT = `---
name: missing-section-skill
description: Missing section 6
license: MIT
compatibility: "Claude Code"
metadata:
  version: "1.0.0"
  author: "alice"
---

## 1. Propósito y Cuándo Usar
P
## 2. Flujo de Trabajo (Workflow)
F
## 3. Reglas y Restricciones (Criterios de Diseño)
R
## 4. Árbol de Decisión (Si aplica)
A
## 5. Ejemplos Ejecutables
E
`;

    it('publishes a new skill with valid content, storing files and deriving name/description/license from frontmatter', async () => {
      const res = await handlePublishSkill({
        token: writeTokenA,
        slug: 'strict-format-skill',
        name: 'Payload Ignored Name',
        description: 'Payload Ignored Description',
        license: 'GPL-3.0',
        content: VALID_SKILL_CONTENT,
      });

      expect(res.id).toBeDefined();
      expect(res.name).toBe('strict-format-skill');
      expect(res.description).toBe('Descripción desde el frontmatter YAML');
      expect(res.license).toBe('Apache-2.0');
      expect(res.owner).toBe(userA.username);

      const inDb = await prisma.skill.findUnique({
        where: { id: res.id },
        include: { versions: true },
      });
      expect(inDb?.name).toBe('strict-format-skill');
      expect(inDb?.description).toBe('Descripción desde el frontmatter YAML');
      expect(inDb?.license).toBe('Apache-2.0');
      expect(inDb?.versions).toHaveLength(1);
      expect(inDb?.versions[0].version).toBe('1.2.0');
      expect(inDb?.versions[0].files).toEqual({ 'SKILL.md': VALID_SKILL_CONTENT });
    });

    it('updates an existing skill with valid content, saving SkillVersion files and overriding metadata from frontmatter', async () => {
      const created = await handlePublishSkill({
        token: writeTokenA,
        slug: 'skill-to-update-with-content',
        name: 'Initial Name',
        description: 'Initial Description',
      });

      const updated = await handlePublishSkill({
        token: writeTokenA,
        id: created.id,
        slug: 'skill-to-update-with-content',
        name: 'Payload Override Attempt',
        description: 'Payload Override Attempt',
        license: 'MIT',
        content: VALID_SKILL_CONTENT_V2,
      });

      expect(updated.name).toBe('strict-format-skill-updated');
      expect(updated.description).toBe('Descripción actualizada desde frontmatter');
      expect(updated.license).toBe('BSD-3-Clause');

      const versions = await prisma.skillVersion.findMany({
        where: { skillId: created.id },
      });
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe('2.0.0');
      expect(versions[0].files).toEqual({ 'SKILL.md': VALID_SKILL_CONTENT_V2 });
    });

    it('rejects publishing a skill with invalid content (invalid semver) without creating Skill or SkillVersion', async () => {
      await expect(
        handlePublishSkill({
          token: writeTokenA,
          slug: 'invalid-semver-skill',
          name: 'Invalid SemVer Skill',
          content: INVALID_SEMVER_CONTENT,
        })
      ).rejects.toThrow(/SemVer válido/);

      const skillInDb = await prisma.skill.findFirst({
        where: { ownerId: userA.id, slug: 'invalid-semver-skill' },
      });
      expect(skillInDb).toBeNull();
    });

    it('accepts publishing with content missing standard sections and updates SkillVersion', async () => {
      const created = await handlePublishSkill({
        token: writeTokenA,
        slug: 'missing-section-target',
        name: 'Initial Skill',
      });

      const versionsCountBefore = await prisma.skillVersion.count({
        where: { skillId: created.id },
      });

      const updated = await handlePublishSkill({
        token: writeTokenA,
        id: created.id,
        slug: 'missing-section-target',
        name: 'Modified Name Attempt',
        content: INVALID_MISSING_SECTION_CONTENT,
      });

      expect(updated.name).toBe('missing-section-skill');

      const inDb = await prisma.skill.findUnique({
        where: { id: created.id },
        include: { versions: true },
      });
      expect(inDb?.name).toBe('missing-section-skill');
      expect(inDb?.versions).toHaveLength(versionsCountBefore + 1);
    });

    it('publishes without content (regression test) maintaining backward compatibility without creating files', async () => {
      const res = await handlePublishSkill({
        token: writeTokenA,
        slug: 'no-content-skill',
        name: 'No Content Skill',
        description: 'Just metadata description',
        license: 'MIT',
      });

      expect(res.id).toBeDefined();
      expect(res.slug).toBe('no-content-skill');
      expect(res.name).toBe('No Content Skill');
      expect(res.description).toBe('Just metadata description');

      const versions = await prisma.skillVersion.findMany({
        where: { skillId: res.id },
      });
      expect(versions).toHaveLength(0);
    });

    it('rejects publishing content to another user\'s skill (ownership isolation)', async () => {
      const skillA = await prisma.skill.create({
        data: {
          slug: 'skill-owned-by-a',
          name: 'Skill A Original',
          ownerId: userA.id,
        },
      });

      await expect(
        handlePublishSkill({
          token: writeTokenB,
          id: skillA.id,
          slug: 'skill-owned-by-a',
          name: 'Tamper Name',
          content: VALID_SKILL_CONTENT,
        })
      ).rejects.toThrow('Skill no encontrada o no pertenece a tu usuario');

      const inDb = await prisma.skill.findUnique({
        where: { id: skillA.id },
        include: { versions: true },
      });
      expect(inDb?.name).toBe('Skill A Original');
      expect(inDb?.versions).toHaveLength(0);
    });
  });

  describe('delete_skill', () => {
    it('requires confirmation and does not delete skill when confirm is omitted or false (private skill)', async () => {
      const skill = await prisma.skill.create({
        data: {
          slug: 'private-confirm-skill',
          name: 'Private Confirm Skill',
          ownerId: userA.id,
          isPublic: false,
        },
      });

      const res = await handleDeleteSkill({
        token: deleteTokenA,
        slug: 'private-confirm-skill',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.requiresConfirmation).toBe(true);
        expect(res.id).toBe(skill.id);
        expect(res.slug).toBe(skill.slug);
        expect(res.name).toBe(skill.name);
        expect(res.isPublic).toBe(false);
        expect(res.message).toMatch(/privada/i);
        expect(res.message).toMatch(/no hay copias de terceros/i);
        expect(res.message).toMatch(/confirm/i);
      }

      const inDb = await prisma.skill.findUnique({ where: { id: skill.id } });
      expect(inDb).not.toBeNull();
    });

    it('requires confirmation and mentions public warning when confirm is omitted for public skill', async () => {
      const skill = await prisma.skill.create({
        data: {
          slug: 'public-confirm-skill',
          name: 'Public Confirm Skill',
          ownerId: userA.id,
          isPublic: true,
        },
      });

      const res = await handleDeleteSkill({
        token: deleteTokenA,
        slug: 'public-confirm-skill',
        confirm: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.requiresConfirmation).toBe(true);
        expect(res.isPublic).toBe(true);
        expect(res.message).toMatch(/pública/i);
        expect(res.message).toMatch(/conservan su copia local/i);
        expect(res.message).toMatch(/confirm/i);
      }

      const inDb = await prisma.skill.findUnique({ where: { id: skill.id } });
      expect(inDb).not.toBeNull();
    });

    it('deletes skill by slug or id with delete scope when confirm: true is provided', async () => {
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
        confirm: true,
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
