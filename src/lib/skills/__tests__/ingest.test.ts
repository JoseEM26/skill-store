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
        version: '1.0.0',
        description: 'Test skill for database ingestion',
        author: testUser,
        license: 'MIT',
        repository: 'https://github.com/Aybar-Corp/Skill-store',
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
        version: '1.1.0',
        description: 'Updated test skill description',
        author: testUser,
        license: 'Apache-2.0',
        repository: 'https://github.com/Aybar-Corp/Skill-store',
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
        version: '1.1.0',
        description: 'Updated test skill description',
        author: testUser,
        license: 'Apache-2.0',
        repository: 'https://github.com/Aybar-Corp/Skill-store',
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
        version: '1.0.0',
        description: 'Attempting version regression',
        author: testUser,
        license: 'MIT',
        repository: 'https://github.com/Aybar-Corp/Skill-store',
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
});
