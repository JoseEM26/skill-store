import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../prisma';
import {
  getPublicCatalog,
  getSkillByOwnerAndSlug,
  getPublicContextById,
} from '../queries';

describe('Catalog Queries', () => {
  const testOwnerUsername = 'catalog-test-user';
  let ownerId = '';

  let publicSkillId = '';
  let archivedSkillId = '';
  let publicIdeaId = '';
  let privateIdeaId = '';
  let archivedContextId = '';
  let publicRefId = '';

  beforeAll(async () => {
    // Cleanup any leftovers first
    const existing = await prisma.user.findFirst({
      where: { username: testOwnerUsername },
    });
    if (existing) {
      await prisma.user.delete({ where: { id: existing.id } });
    }

    // Create test user
    const owner = await prisma.user.create({
      data: {
        githubId: 'gh_catalog_test_user',
        username: testOwnerUsername,
        avatarUrl: 'https://github.com/catalog-test-user.png',
      },
    });
    ownerId = owner.id;

    // 1. Create Public Skill with 2 versions
    const pubSkill = await prisma.skill.create({
      data: {
        slug: 'super-catalog-skill',
        name: 'Super Catalog Skill',
        description: 'A special skill for catalog querying tests',
        ownerId: owner.id,
        license: 'MIT',
        repositoryUrl: 'https://github.com/catalog-test-user/super-catalog-skill',
        isArchived: false,
        versions: {
          create: [
            {
              version: '1.0.0',
              changelog: 'Initial v1.0.0 release',
              gitTag: 'super-catalog-skill-v1.0.0',
            },
            {
              version: '1.2.0',
              changelog: 'Upgraded to v1.2.0 with more features',
              gitTag: 'super-catalog-skill-v1.2.0',
            },
          ],
        },
      },
    });
    publicSkillId = pubSkill.id;

    // 2. Create Archived Skill
    const archSkill = await prisma.skill.create({
      data: {
        slug: 'archived-test-skill',
        name: 'Archived Test Skill',
        description: 'Should not appear anywhere in public catalog',
        ownerId: owner.id,
        isArchived: true,
      },
    });
    archivedSkillId = archSkill.id;

    // 3. Create Public Idea
    const pubIdea = await prisma.context.create({
      data: {
        type: 'idea',
        title: 'Public Architecture Idea',
        body: 'This is a public thought note for testing search query',
        tags: ['architecture', 'microservices', 'public-note'],
        isPublic: true,
        isArchived: false,
        ownerId: owner.id,
      },
    });
    publicIdeaId = pubIdea.id;

    // 4. Create Private Idea (CRITICAL SECURITY CHECK)
    const privIdea = await prisma.context.create({
      data: {
        type: 'idea',
        title: 'Top Secret Private Idea',
        body: 'Sensitive personal thoughts that MUST NEVER leak publicly',
        tags: ['secret', 'internal'],
        isPublic: false,
        isArchived: false,
        ownerId: owner.id,
      },
    });
    privateIdeaId = privIdea.id;

    // 5. Create Archived Context
    const archCtx = await prisma.context.create({
      data: {
        type: 'idea',
        title: 'Archived Context Idea',
        body: 'Was public once but now archived',
        tags: ['archived'],
        isPublic: true,
        isArchived: true,
        ownerId: owner.id,
      },
    });
    archivedContextId = archCtx.id;

    // 6. Create Public External Reference
    const pubRef = await prisma.context.create({
      data: {
        type: 'external_reference',
        title: 'Superpowers Library Reference',
        body: 'Great AI agent framework tools',
        link: 'https://github.com/obra/superpowers',
        tags: ['tools', 'ecosystem', 'superpowers'],
        isPublic: true,
        isArchived: false,
        ownerId: owner.id,
      },
    });
    publicRefId = pubRef.id;
  });

  afterAll(async () => {
    // Clean up test data completely
    if (ownerId) {
      await prisma.user.delete({ where: { id: ownerId } }).catch(() => {});
    }
  });

  describe('getPublicCatalog', () => {
    it('returns public skills and public contexts while strictly excluding private and archived items', async () => {
      const result = await getPublicCatalog();

      const itemIds = result.items.map((i) => i.id);

      // Must contain public items
      expect(itemIds).toContain(publicSkillId);
      expect(itemIds).toContain(publicIdeaId);
      expect(itemIds).toContain(publicRefId);

      // STRICT SECURITY: Must NOT contain private or archived items
      expect(itemIds).not.toContain(privateIdeaId);
      expect(itemIds).not.toContain(archivedSkillId);
      expect(itemIds).not.toContain(archivedContextId);
    });

    it('filters items by search query string', async () => {
      const result = await getPublicCatalog({ q: 'Superpowers' });
      expect(result.items.some((i) => i.id === publicRefId)).toBe(true);
      expect(result.items.some((i) => i.id === publicSkillId)).toBe(false);
    });

    it('filters by type = skills', async () => {
      const result = await getPublicCatalog({ type: 'skills' });
      expect(result.items.every((i) => i.kind === 'skill')).toBe(true);
      expect(result.items.some((i) => i.id === publicSkillId)).toBe(true);
      expect(result.items.some((i) => i.id === publicRefId)).toBe(false);
    });

    it('filters by type = ideas', async () => {
      const result = await getPublicCatalog({ type: 'ideas' });
      expect(result.items.every((i) => i.kind === 'context' && i.type === 'idea')).toBe(true);
      expect(result.items.some((i) => i.id === publicIdeaId)).toBe(true);
      expect(result.items.some((i) => i.id === privateIdeaId)).toBe(false);
    });
  });

  describe('getSkillByOwnerAndSlug', () => {
    it('returns full skill detail with owner and sorted version history', async () => {
      const skill = await getSkillByOwnerAndSlug(testOwnerUsername, 'super-catalog-skill');

      expect(skill).not.toBeNull();
      expect(skill?.name).toBe('Super Catalog Skill');
      expect(skill?.owner.username).toBe(testOwnerUsername);
      expect(skill?.latestVersion?.version).toBe('1.2.0');
      expect(skill?.versions).toHaveLength(2);
      expect(skill?.versions[0].version).toBe('1.2.0');
      expect(skill?.versions[1].version).toBe('1.0.0');
    });

    it('returns null for nonexistent skill or wrong owner', async () => {
      const result1 = await getSkillByOwnerAndSlug('wrong-user', 'super-catalog-skill');
      expect(result1).toBeNull();

      const result2 = await getSkillByOwnerAndSlug(testOwnerUsername, 'nonexistent-slug');
      expect(result2).toBeNull();
    });

    it('returns null for archived skill', async () => {
      const result = await getSkillByOwnerAndSlug(testOwnerUsername, 'archived-test-skill');
      expect(result).toBeNull();
    });
  });

  describe('getPublicContextById', () => {
    it('returns context data for a public context', async () => {
      const context = await getPublicContextById(publicRefId);
      expect(context).not.toBeNull();
      expect(context?.title).toBe('Superpowers Library Reference');
      expect(context?.link).toBe('https://github.com/obra/superpowers');
      expect(context?.owner.username).toBe(testOwnerUsername);
    });

    it('returns null for a private idea (strict privacy guard)', async () => {
      const context = await getPublicContextById(privateIdeaId);
      expect(context).toBeNull();
    });

    it('returns null for an archived context', async () => {
      const context = await getPublicContextById(archivedContextId);
      expect(context).toBeNull();
    });

    it('returns null for nonexistent id', async () => {
      const context = await getPublicContextById('nonexistent-id-12345');
      expect(context).toBeNull();
    });
  });
});
