import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  handleListSkills,
  handleSearchSkills,
  handleGetSkill,
  handleGetVersion,
  handleCheckUpdates,
  handleListContexts,
  handleGetContext,
  handleGetMySetup,
  handleInstallSkill,
} from '../tools';
import { createAccessToken } from '@/lib/auth/tokens';

describe('MCP Read Tools & Setup Service', () => {
  let userA: { id: string; githubId: string; username: string };
  let userB: { id: string; githubId: string; username: string };
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    userA = await prisma.user.create({
      data: {
        githubId: `test-mcp-user-a-${Date.now()}`,
        username: `mcp_user_a_${Date.now()}`,
      },
    });

    userB = await prisma.user.create({
      data: {
        githubId: `test-mcp-user-b-${Date.now()}`,
        username: `mcp_user_b_${Date.now()}`,
      },
    });

    const resTokenA = await createAccessToken(userA.id, {
      label: 'Token User A',
      scopes: ['read', 'write'],
    });
    tokenA = resTokenA.rawToken;

    const resTokenB = await createAccessToken(userB.id, {
      label: 'Token User B',
      scopes: ['read'],
    });
    tokenB = resTokenB.rawToken;
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

  describe('Skills Catalog Tools', () => {
    beforeEach(async () => {
      const skillA = await prisma.skill.create({
        data: {
          slug: 'planner-agent',
          name: 'Planner Agent',
          description: 'Autonomous planner and coordinator',
          license: 'MIT',
          ownerId: userA.id,
          downloadsCount: 50,
          installsCount: 20,
        },
      });

      await prisma.skillVersion.create({
        data: {
          skillId: skillA.id,
          version: '1.0.0',
          changelog: 'Initial version',
          gitTag: 'v1.0.0',
        },
      });

      await prisma.skillVersion.create({
        data: {
          skillId: skillA.id,
          version: '1.1.0',
          changelog: 'Added parallel dispatching',
          gitTag: 'v1.1.0',
        },
      });
    });

    it('list_skills returns public skills with latest version', async () => {
      const skills = await handleListSkills({});
      const skill = skills.find((s) => s.slug === 'planner-agent');

      expect(skill).toBeDefined();
      expect(skill?.owner).toBe(userA.username);
      expect(skill?.latestVersion?.version).toBe('1.1.0');
      expect(skill?.installCommand).toBe(`npx skills add ${userA.username}/planner-agent`);
    });

    it('search_skills filters skills by query', async () => {
      const match = await handleSearchSkills({ query: 'autonomous' });
      expect(match.length).toBeGreaterThanOrEqual(1);
      expect(match.some((s) => s.slug === 'planner-agent')).toBe(true);

      const noMatch = await handleSearchSkills({ query: 'nonexistentterm12345' });
      expect(noMatch.some((s) => s.slug === 'planner-agent')).toBe(false);
    });

    it('get_skill returns full skill detail and version history sorted by SemVer', async () => {
      const skill = await handleGetSkill({
        owner: userA.username,
        slug: 'planner-agent',
      });

      expect(skill.name).toBe('Planner Agent');
      expect(skill.versions.length).toBe(2);
      expect(skill.versions[0].version).toBe('1.1.0');
      expect(skill.versions[1].version).toBe('1.0.0');
    });

    it('get_version returns specific version details', async () => {
      const version = await handleGetVersion({
        owner: userA.username,
        slug: 'planner-agent',
        version: '1.0.0',
      });

      expect(version.version).toBe('1.0.0');
      expect(version.changelog).toBe('Initial version');
      expect(version.gitTag).toBe('v1.0.0');
    });

    it('check_updates compares currentVersion and returns update status', async () => {
      const hasUpdateRes = await handleCheckUpdates({
        owner: userA.username,
        slug: 'planner-agent',
        currentVersion: '1.0.0',
      });
      expect(hasUpdateRes.hasUpdate).toBe(true);
      expect(hasUpdateRes.latestVersion).toBe('1.1.0');
      expect(hasUpdateRes.changelog).toBe('Added parallel dispatching');

      const upToDateRes = await handleCheckUpdates({
        owner: userA.username,
        slug: 'planner-agent',
        currentVersion: '1.1.0',
      });
      expect(upToDateRes.hasUpdate).toBe(false);
    });
  });

  describe('Contexts Tools (Strict Privacy & Ownership)', () => {
    let ideaA: { id: string };
    let ideaB: { id: string };
    let refPublic: { id: string };

    beforeEach(async () => {
      // User A private idea
      ideaA = await prisma.context.create({
        data: {
          type: 'idea',
          title: 'Idea Privada de User A',
          body: 'Secreto de User A',
          isPublic: false,
          ownerId: userA.id,
        },
      });

      // User B private idea
      ideaB = await prisma.context.create({
        data: {
          type: 'idea',
          title: 'Idea Privada de User B',
          body: 'Secreto de User B',
          isPublic: false,
          ownerId: userB.id,
        },
      });

      // Public reference
      refPublic = await prisma.context.create({
        data: {
          type: 'external_reference',
          title: 'Next.js Reference',
          link: 'https://nextjs.org',
          isPublic: true,
          ownerId: userA.id,
        },
      });
    });

    it('list_contexts without token returns ONLY public contexts', async () => {
      const contexts = await handleListContexts({});

      const ids = contexts.map((c) => c.id);
      expect(ids).toContain(refPublic.id);
      expect(ids).not.toContain(ideaA.id);
      expect(ids).not.toContain(ideaB.id);
    });

    it('list_contexts with User A token includes User A private ideas, but EXCLUDES User B private ideas', async () => {
      const contexts = await handleListContexts({ token: tokenA });

      const ids = contexts.map((c) => c.id);
      expect(ids).toContain(refPublic.id);
      expect(ids).toContain(ideaA.id); // Included for owner A
      expect(ids).not.toContain(ideaB.id); // STRICT: Excluded because it belongs to B
    });

    it('get_context permits owner with token and rejects non-owner or unauthenticated requests', async () => {
      // Public context: accessible anonymously
      const pubCtx = await handleGetContext({ id: refPublic.id });
      expect(pubCtx.title).toBe('Next.js Reference');

      // Private idea A with User A token: accessible
      const ideaOwner = await handleGetContext({ id: ideaA.id, token: tokenA });
      expect(ideaOwner.title).toBe('Idea Privada de User A');

      // Private idea A without token: rejected
      await expect(handleGetContext({ id: ideaA.id })).rejects.toThrow(/privado/i);

      // Private idea A with User B token: rejected
      await expect(handleGetContext({ id: ideaA.id, token: tokenB })).rejects.toThrow(/permiso/i);
    });
  });

  describe('get_my_setup tool (Consolidated turn initialization)', () => {
    beforeEach(async () => {
      const skill = await prisma.skill.create({
        data: {
          slug: 'dev-assistant',
          name: 'Dev Assistant',
          license: 'MIT',
          ownerId: userA.id,
        },
      });

      await prisma.skillVersion.create({
        data: {
          skillId: skill.id,
          version: '2.0.0',
          changelog: 'V2 rewrite',
        },
      });

      await prisma.context.create({
        data: {
          type: 'idea',
          title: 'My Custom Setup Idea',
          body: 'Agent system prompt guidelines',
          isPublic: false,
          ownerId: userA.id,
        },
      });

      await prisma.context.create({
        data: {
          type: 'external_reference',
          title: 'MCP Protocol Specs',
          link: 'https://modelcontextprotocol.io',
          isPublic: true,
          ownerId: userA.id,
        },
      });
    });

    it('returns full setup for authenticated user in a single structured payload', async () => {
      const setup = await handleGetMySetup({ token: tokenA });

      expect(setup.user.id).toBe(userA.id);
      expect(setup.user.username).toBe(userA.username);

      expect(setup.skills.length).toBe(1);
      expect(setup.skills[0].slug).toBe('dev-assistant');
      expect(setup.skills[0].latestVersion?.version).toBe('2.0.0');

      expect(setup.contexts.ideas.length).toBe(1);
      expect(setup.contexts.ideas[0].title).toBe('My Custom Setup Idea');

      expect(setup.contexts.externalReferences.length).toBe(1);
      expect(setup.contexts.externalReferences[0].title).toBe('MCP Protocol Specs');
    });

    it('rejects get_my_setup without valid token', async () => {
      await expect(handleGetMySetup({ token: '' })).rejects.toThrow();
      await expect(
        handleGetMySetup({ token: 'ccs_invalidtoken000000000000000000000000000000000000000000000000000000' })
      ).rejects.toThrow(/Autenticación fallida/i);
    });
  });

  describe('install_skill tool (Popularity Tracking - ADR-0009)', () => {
    let testSkill: { id: string; slug: string };

    beforeEach(async () => {
      testSkill = await prisma.skill.create({
        data: {
          slug: 'mcp-install-target',
          name: 'MCP Install Target Skill',
          ownerId: userA.id,
          downloadsCount: 5,
          installsCount: 10,
          isArchived: false,
          versions: {
            create: {
              version: '1.0.0',
              changelog: 'Initial version',
            },
          },
        },
      });
    });

    it('increments installsCount and returns metadata without authentication', async () => {
      const result = await handleInstallSkill({
        owner: userA.username,
        slug: testSkill.slug,
      });

      expect(result.success).toBe(true);
      expect(result.installsCount).toBe(11);
      expect(result.skill).toBe(`${userA.username}/${testSkill.slug}`);
      expect(result.installCommand).toBe(`npx skills add ${userA.username}/${testSkill.slug}`);

      // Call second time
      const result2 = await handleInstallSkill({
        owner: userA.username,
        slug: testSkill.slug,
      });
      expect(result2.installsCount).toBe(12);

      // Verify in DB
      const inDb = await prisma.skill.findUnique({ where: { id: testSkill.id } });
      expect(inDb?.installsCount).toBe(12);
    });

    it('throws error for nonexistent skill', async () => {
      await expect(
        handleInstallSkill({ owner: userA.username, slug: 'nonexistent-slug' })
      ).rejects.toThrow(/no encontrada/i);
    });

    it('allows consulting and installing an archived skill via MCP', async () => {
      const archSkill = await prisma.skill.create({
        data: {
          slug: 'archived-mcp-target',
          name: 'Archived MCP Skill',
          ownerId: userA.id,
          downloadsCount: 10,
          installsCount: 5,
          isArchived: true,
          versions: {
            create: {
              version: '1.0.0',
              changelog: 'Archived skill initial',
            },
          },
        },
      });

      // 1. handleGetSkill returns metadata and isArchived = true
      const getRes = await handleGetSkill({
        owner: userA.username,
        slug: archSkill.slug,
      });
      expect(getRes.name).toBe('Archived MCP Skill');
      expect(getRes.isArchived).toBe(true);

      // 2. handleInstallSkill returns installCommand and success for archived skill
      const installRes = await handleInstallSkill({
        owner: userA.username,
        slug: archSkill.slug,
      });
      expect(installRes.success).toBe(true);
      expect(installRes.isArchived).toBe(true);
      expect(installRes.installCommand).toBe(`npx skills add ${userA.username}/${archSkill.slug}`);
    });
  });
});

