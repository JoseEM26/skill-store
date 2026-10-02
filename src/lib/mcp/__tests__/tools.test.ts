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
          files: { 'SKILL.md': '# Planner Agent v1.0.0' },
        },
      });

      await prisma.skillVersion.create({
        data: {
          skillId: skillA.id,
          version: '1.1.0',
          changelog: 'Added parallel dispatching',
          gitTag: 'v1.1.0',
          files: { 'SKILL.md': '# Planner Agent v1.1.0', 'template.json': '{"key": "value"}' },
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

    it('get_skill returns full skill detail and version history sorted by SemVer with files', async () => {
      const skill = await handleGetSkill({
        owner: userA.username,
        slug: 'planner-agent',
      });

      expect(skill.name).toBe('Planner Agent');
      expect(skill.versions.length).toBe(2);
      expect(skill.versions[0].version).toBe('1.1.0');
      expect(skill.versions[0].files).toEqual({
        'SKILL.md': '# Planner Agent v1.1.0',
        'template.json': '{"key": "value"}',
      });
      expect(skill.versions[1].version).toBe('1.0.0');
      expect(skill.versions[1].files).toEqual({
        'SKILL.md': '# Planner Agent v1.0.0',
      });
      expect(skill.latestVersion?.files).toEqual({
        'SKILL.md': '# Planner Agent v1.1.0',
        'template.json': '{"key": "value"}',
      });
    });

    it('get_version returns specific version details and files', async () => {
      const version = await handleGetVersion({
        owner: userA.username,
        slug: 'planner-agent',
        version: '1.0.0',
      });

      expect(version.version).toBe('1.0.0');
      expect(version.changelog).toBe('Initial version');
      expect(version.gitTag).toBe('v1.0.0');
      expect(version.files).toEqual({
        'SKILL.md': '# Planner Agent v1.0.0',
      });
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

    it('list_skills without token excludes private and paused skills', async () => {
      const privateA = await prisma.skill.create({
        data: {
          slug: 'private-skill-a',
          name: 'Private Skill A',
          isPublic: false,
          isPaused: false,
          ownerId: userA.id,
        },
      });

      const pausedA = await prisma.skill.create({
        data: {
          slug: 'paused-skill-a',
          name: 'Paused Skill A',
          isPublic: true,
          isPaused: true,
          ownerId: userA.id,
        },
      });

      const publicB = await prisma.skill.create({
        data: {
          slug: 'public-skill-b',
          name: 'Public Skill B',
          isPublic: true,
          isPaused: false,
          ownerId: userB.id,
        },
      });

      const skills = await handleListSkills({});
      const slugs = skills.map((s) => s.slug);

      expect(slugs).toContain('planner-agent');
      expect(slugs).toContain(publicB.slug);
      expect(slugs).not.toContain(privateA.slug);
      expect(slugs).not.toContain(pausedA.slug);
    });

    it('list_skills with token includes owner\'s private/paused skills, but excludes other users\' private/paused skills', async () => {
      const privateA = await prisma.skill.create({
        data: {
          slug: 'priv-skill-a',
          name: 'Priv Skill A',
          isPublic: false,
          isPaused: false,
          ownerId: userA.id,
        },
      });

      const pausedA = await prisma.skill.create({
        data: {
          slug: 'pau-skill-a',
          name: 'Pau Skill A',
          isPublic: true,
          isPaused: true,
          ownerId: userA.id,
        },
      });

      const privateB = await prisma.skill.create({
        data: {
          slug: 'priv-skill-b',
          name: 'Priv Skill B',
          isPublic: false,
          isPaused: false,
          ownerId: userB.id,
        },
      });

      const pausedB = await prisma.skill.create({
        data: {
          slug: 'pau-skill-b',
          name: 'Pau Skill B',
          isPublic: true,
          isPaused: true,
          ownerId: userB.id,
        },
      });

      // User A queries with tokenA
      const skillsA = await handleListSkills({ token: tokenA });
      const slugsA = skillsA.map((s) => s.slug);

      expect(slugsA).toContain(privateA.slug);
      expect(slugsA).toContain(pausedA.slug);
      expect(slugsA).not.toContain(privateB.slug);
      expect(slugsA).not.toContain(pausedB.slug);

      // User B queries with tokenB
      const skillsB = await handleListSkills({ token: tokenB });
      const slugsB = skillsB.map((s) => s.slug);

      expect(slugsB).not.toContain(privateA.slug);
      expect(slugsB).not.toContain(pausedA.slug);
      expect(slugsB).toContain(privateB.slug);
      expect(slugsB).toContain(pausedB.slug);
    });

    it('search_skills filters out private/paused skills unless authenticated as owner', async () => {
      const hiddenSkill = await prisma.skill.create({
        data: {
          slug: 'supersecret-algorithm',
          name: 'SuperSecret Algorithm',
          description: 'Top secret quantum planner',
          isPublic: false,
          isPaused: false,
          ownerId: userA.id,
        },
      });

      // Public / unauthenticated search
      const noAuthSearch = await handleSearchSkills({ query: 'supersecret' });
      expect(noAuthSearch.some((s) => s.slug === hiddenSkill.slug)).toBe(false);

      // Other user (User B) search
      const userBSearch = await handleSearchSkills({ query: 'supersecret', token: tokenB });
      expect(userBSearch.some((s) => s.slug === hiddenSkill.slug)).toBe(false);

      // Owner (User A) search
      const ownerSearch = await handleSearchSkills({ query: 'supersecret', token: tokenA });
      expect(ownerSearch.some((s) => s.slug === hiddenSkill.slug)).toBe(true);
    });

    it('get_skill and get_version allow owner to access private and paused skills with token, rejecting unauthenticated and non-owner callers', async () => {
      const privateA = await prisma.skill.create({
        data: {
          slug: 'vault-agent',
          name: 'Vault Agent',
          isPublic: false,
          isPaused: false,
          ownerId: userA.id,
          versions: {
            create: {
              version: '1.0.0',
              changelog: 'Initial private version',
              files: { 'SKILL.md': '# Vault Secret Content', 'keys.env': 'PRIVATE_KEY=xyz' },
            },
          },
        },
      });

      const pausedA = await prisma.skill.create({
        data: {
          slug: 'standby-agent',
          name: 'Standby Agent',
          isPublic: true,
          isPaused: true,
          ownerId: userA.id,
          versions: {
            create: {
              version: '1.0.0',
              changelog: 'Initial paused version',
              files: { 'SKILL.md': '# Standby Agent Content' },
            },
          },
        },
      });

      // 1. Private skill - handleGetSkill
      // Without token: not found, files not exposed
      await expect(
        handleGetSkill({ owner: userA.username, slug: privateA.slug })
      ).rejects.toThrow(/no encontrada/i);

      // With non-owner token (User B): not found, files not exposed
      await expect(
        handleGetSkill({ owner: userA.username, slug: privateA.slug, token: tokenB })
      ).rejects.toThrow(/no encontrada/i);

      // With owner token (User A): found, files returned
      const ownerPrivateSkill = await handleGetSkill({
        owner: userA.username,
        slug: privateA.slug,
        token: tokenA,
      });
      expect(ownerPrivateSkill.name).toBe('Vault Agent');
      expect(ownerPrivateSkill.isPublic).toBe(false);
      expect(ownerPrivateSkill.latestVersion?.files).toEqual({
        'SKILL.md': '# Vault Secret Content',
        'keys.env': 'PRIVATE_KEY=xyz',
      });

      // 2. Private skill - handleGetVersion
      // Without token: not found
      await expect(
        handleGetVersion({ owner: userA.username, slug: privateA.slug, version: '1.0.0' })
      ).rejects.toThrow(/no encontrada/i);

      // With non-owner token: not found
      await expect(
        handleGetVersion({ owner: userA.username, slug: privateA.slug, version: '1.0.0', token: tokenB })
      ).rejects.toThrow(/no encontrada/i);

      // With owner token: found, files returned
      const ownerPrivateVersion = await handleGetVersion({
        owner: userA.username,
        slug: privateA.slug,
        version: '1.0.0',
        token: tokenA,
      });
      expect(ownerPrivateVersion.version).toBe('1.0.0');
      expect(ownerPrivateVersion.files).toEqual({
        'SKILL.md': '# Vault Secret Content',
        'keys.env': 'PRIVATE_KEY=xyz',
      });

      // 3. Paused skill - handleGetSkill
      // Without token: not found
      await expect(
        handleGetSkill({ owner: userA.username, slug: pausedA.slug })
      ).rejects.toThrow(/no encontrada/i);

      // With non-owner token (User B): not found
      await expect(
        handleGetSkill({ owner: userA.username, slug: pausedA.slug, token: tokenB })
      ).rejects.toThrow(/no encontrada/i);

      // With owner token (User A): found
      const ownerPausedSkill = await handleGetSkill({
        owner: userA.username,
        slug: pausedA.slug,
        token: tokenA,
      });
      expect(ownerPausedSkill.name).toBe('Standby Agent');
      expect(ownerPausedSkill.isPaused).toBe(true);
      expect(ownerPausedSkill.latestVersion?.files).toEqual({
        'SKILL.md': '# Standby Agent Content',
      });

      // 4. Paused skill - handleGetVersion
      // Without token: not found
      await expect(
        handleGetVersion({ owner: userA.username, slug: pausedA.slug, version: '1.0.0' })
      ).rejects.toThrow(/no encontrada/i);

      // With non-owner token: not found
      await expect(
        handleGetVersion({ owner: userA.username, slug: pausedA.slug, version: '1.0.0', token: tokenB })
      ).rejects.toThrow(/no encontrada/i);

      // With owner token: found
      const ownerPausedVersion = await handleGetVersion({
        owner: userA.username,
        slug: pausedA.slug,
        version: '1.0.0',
        token: tokenA,
      });
      expect(ownerPausedVersion.version).toBe('1.0.0');
      expect(ownerPausedVersion.files).toEqual({
        'SKILL.md': '# Standby Agent Content',
      });
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

