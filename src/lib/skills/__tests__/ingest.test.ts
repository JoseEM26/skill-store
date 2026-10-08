import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../prisma';
import { ingestSkill } from '../ingest';
import { ParsedSkill } from '../validation';

describe('Skill ingestion into PostgreSQL', () => {
  const testUser = 'integration-test-user';
  const testSlug = 'test-ingest-skill';

  beforeAll(async () => {
    // Cleanup any existing test data
    const user = await prisma.user.findFirst({
      where: { username: testUser },
    });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  afterAll(async () => {
    // Cleanup
    const user = await prisma.user.findFirst({
      where: { username: testUser },
    });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it('ingests a new skill and creates initial version in database', async () => {
    const sampleSkill: ParsedSkill = {
      slug: testSlug,
      frontmatter: {
        name: testSlug,
        description: 'Test skill for database ingestion',
        license: 'MIT',
        compatibility: 'Claude Code, Cursor >= 0.40',
        metadata: {
          version: '1.0.0',
          author: testUser,
        },
      },
      body: '# Test Skill Content',
    };

    const result = await ingestSkill(sampleSkill, { ownerUsername: testUser });
    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
    expect(result.slug).toBe(testSlug);
    expect(result.version).toBe('1.0.0');

    // Verify record in PostgreSQL
    const skillInDb = await prisma.skill.findFirst({
      where: { slug: testSlug },
      include: { versions: true, owner: true },
    });

    expect(skillInDb).not.toBeNull();
    expect(skillInDb?.name).toBe(testSlug);
    expect(skillInDb?.isPublic).toBe(false);
    expect(skillInDb?.owner.username).toBe(testUser);
    expect(skillInDb?.versions).toHaveLength(1);
    expect(skillInDb?.versions[0].version).toBe('1.0.0');
    expect(skillInDb?.versions[0].gitTag).toBe(`${testSlug}-v1.0.0`);
  });

  it('updates skill metadata and adds a new version when incremented', async () => {
    const updatedSkill: ParsedSkill = {
      slug: testSlug,
      frontmatter: {
        name: testSlug,
        description: 'Updated test skill description',
        license: 'Apache-2.0',
        compatibility: 'Claude Code, Cursor >= 0.40',
        metadata: {
          version: '1.1.0',
          author: testUser,
        },
      },
      body: '# Updated Skill Content',
    };

    const result = await ingestSkill(updatedSkill, {
      ownerUsername: testUser,
      changelog: 'Added new features in 1.1.0',
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('version_added');
    expect(result.version).toBe('1.1.0');

    const skillInDb = await prisma.skill.findFirst({
      where: { slug: testSlug },
      include: { versions: true },
    });

    expect(skillInDb?.description).toBe('Updated test skill description');
    expect(skillInDb?.license).toBe('Apache-2.0');
    expect(skillInDb?.versions).toHaveLength(2);

    const v110 = skillInDb?.versions.find((v) => v.version === '1.1.0');
    expect(v110?.changelog).toBe('Added new features in 1.1.0');
  });

  it('skips creating duplicate version when it is already the highest version without failing', async () => {
    const duplicateSkill: ParsedSkill = {
      slug: testSlug,
      frontmatter: {
        name: testSlug,
        description: 'Updated test skill description',
        license: 'Apache-2.0',
        compatibility: 'Claude Code, Cursor >= 0.40',
        metadata: {
          version: '1.1.0',
          author: testUser,
        },
      },
      body: '# Updated Skill Content',
    };

    const result = await ingestSkill(duplicateSkill, { ownerUsername: testUser });
    expect(result.success).toBe(true);
    expect(result.action).toBe('skipped_existing_version');
  });

  it('rejects publication when attempting to publish a version lower than the maximum registered version', async () => {
    // Current highest in DB is 1.1.0; attempting to ingest 1.0.0 again must fail
    const regressionSkill: ParsedSkill = {
      slug: testSlug,
      frontmatter: {
        name: testSlug,
        description: 'Attempting version regression',
        license: 'MIT',
        compatibility: 'Claude Code, Cursor >= 0.40',
        metadata: {
          version: '1.0.0',
          author: testUser,
        },
      },
      body: '# Regressed Skill Content',
    };

    const result = await ingestSkill(regressionSkill, { ownerUsername: testUser });
    expect(result.success).toBe(false);
    expect(result.action).toBe('error');
    expect(result.error).toContain('Regresión de versión');
    expect(result.error).toContain('1.0.0');
    expect(result.error).toContain('1.1.0');
  });

  it('preserves isPublic status when ingesting a new version of an existing skill', async () => {
    // Manually mark the existing skill as public in the DB (simulating owner making it public from panel)
    await prisma.skill.updateMany({
      where: { slug: testSlug, owner: { username: testUser } },
      data: { isPublic: true },
    });

    const newVersionSkill: ParsedSkill = {
      slug: testSlug,
      frontmatter: {
        name: testSlug,
        description: 'New version 1.2.0',
        license: 'Apache-2.0',
        compatibility: 'Claude Code, Cursor >= 0.40',
        metadata: {
          version: '1.2.0',
          author: testUser,
        },
      },
      body: '# New Version Content',
    };

    const result = await ingestSkill(newVersionSkill, {
      ownerUsername: testUser,
      changelog: 'Added version 1.2.0',
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('version_added');
    expect(result.version).toBe('1.2.0');

    const skillInDb = await prisma.skill.findFirst({
      where: { slug: testSlug, owner: { username: testUser } },
    });

    expect(skillInDb?.isPublic).toBe(true);
  });

  it('ingests a skill with additional files (manual-desarrollo reference) and stores all files in SkillVersion.files', async () => {
    const manualSkill: ParsedSkill = {
      slug: 'manual-desarrollo',
      frontmatter: {
        name: 'manual-desarrollo',
        description: 'Manual de desarrollo con archivos adicionales',
        license: 'MIT',
        compatibility: 'Claude Code, Cursor >= 0.40',
        metadata: {
          version: '1.0.0',
          author: testUser,
        },
      },
      body: '# Manual de Desarrollo',
      files: {
        'SKILL.md': '# Manual de Desarrollo',
        'plantilla-visual.html': '<!DOCTYPE html><html><body>Template</body></html>',
      },
    };

    const result = await ingestSkill(manualSkill, { ownerUsername: testUser });
    expect(result.success).toBe(true);

    const skillInDb = await prisma.skill.findFirst({
      where: {
        slug: manualSkill.slug,
        owner: { username: testUser },
      },
      include: { versions: true },
    });

    expect(skillInDb).not.toBeNull();
    expect(skillInDb?.isPublic).toBe(false);
    const versionInDb = skillInDb?.versions[0];
    expect(versionInDb?.files).toBeDefined();

    const files = versionInDb?.files as Record<string, string>;
    expect(Object.keys(files)).toContain('SKILL.md');
    expect(Object.keys(files)).toContain('plantilla-visual.html');
    expect(files['plantilla-visual.html']).toContain('DOCTYPE html');
    expect(files['SKILL.md']).toContain('Manual de Desarrollo');
  });

  it('ingests a skill without license, compatibility, or author and defaults license to MIT', async () => {
    const minimalSkill: ParsedSkill = {
      slug: 'minimal-ingest-skill',
      frontmatter: {
        name: 'minimal-ingest-skill',
        description: 'Skill sin license ni author',
        metadata: {
          version: '1.0.0',
          author: undefined,
        },
      },
      body: '# Minimal Skill Content',
    };

    const result = await ingestSkill(minimalSkill, { ownerUsername: testUser });
    expect(result.success).toBe(true);
    expect(result.action).toBe('created');

    const skillInDb = await prisma.skill.findFirst({
      where: {
        slug: minimalSkill.slug,
        owner: { username: testUser },
      },
      include: { versions: true },
    });

    expect(skillInDb).not.toBeNull();
    expect(skillInDb?.license).toBe('MIT');
    expect(skillInDb?.isPublic).toBe(false);
    expect(skillInDb?.versions).toHaveLength(1);
    expect(skillInDb?.versions[0].version).toBe('1.0.0');
  });
});
