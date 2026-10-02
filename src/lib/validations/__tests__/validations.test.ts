import { describe, it, expect } from 'vitest';
import {
  createIdeaSchema,
  updateIdeaSchema,
  createExternalReferenceSchema,
  updateExternalReferenceSchema,
} from '../context';
import { createSkillSchema, updateSkillSchema } from '../skill';

describe('Context validation schemas', () => {
  it('validates createIdeaSchema with default isPublic = false', () => {
    const result = createIdeaSchema.parse({
      title: 'Mi idea privada',
      body: 'Detalle de la idea',
      tags: 'ai, agents, nextjs',
    });

    expect(result.title).toBe('Mi idea privada');
    expect(result.isPublic).toBe(false);
    expect(result.tags).toEqual(['ai', 'agents', 'nextjs']);
  });

  it('allows explicit isPublic = true on createIdeaSchema', () => {
    const result = createIdeaSchema.parse({
      title: 'Idea pública',
      isPublic: true,
    });

    expect(result.isPublic).toBe(true);
  });

  it('validates createExternalReferenceSchema and enforces isPublic = true', () => {
    const result = createExternalReferenceSchema.parse({
      title: 'Context7 Tool',
      link: 'https://github.com/upstash/context7',
      tags: ['mcp', 'context'],
    });

    expect(result.link).toBe('https://github.com/upstash/context7');
    expect(result.isPublic).toBe(true);
  });

  it('rejects createExternalReferenceSchema if link is missing or invalid URL', () => {
    expect(() =>
      createExternalReferenceSchema.parse({
        title: 'Tool sin link',
        link: 'not-a-valid-url',
      })
    ).toThrow();
  });

  it('validates updateIdeaSchema and updateExternalReferenceSchema with valid id', () => {
    const idea = updateIdeaSchema.parse({
      id: 'idea-123',
      title: 'Updated Idea Title',
    });
    expect(idea.id).toBe('idea-123');
    expect(idea.title).toBe('Updated Idea Title');

    const extRef = updateExternalReferenceSchema.parse({
      id: 'ref-123',
      title: 'Updated Ref Title',
      link: 'https://example.com/updated',
    });
    expect(extRef.id).toBe('ref-123');
    expect(extRef.link).toBe('https://example.com/updated');
  });
});

describe('Skill validation schemas', () => {
  it('validates createSkillSchema with slug, name, license', () => {
    const result = createSkillSchema.parse({
      slug: 'my-custom-skill',
      name: 'My Custom Skill',
      description: 'A great skill',
      repositoryUrl: 'https://github.com/user/my-skill',
    });

    expect(result.slug).toBe('my-custom-skill');
    expect(result.license).toBe('MIT');
  });

  it('rejects createSkillSchema with invalid slug characters', () => {
    expect(() =>
      createSkillSchema.parse({
        slug: 'Invalid Slug With Spaces!',
        name: 'Invalid Skill',
      })
    ).toThrow();
  });

  it('validates updateSkillSchema with empty repositoryUrl as undefined', () => {
    const result = updateSkillSchema.parse({
      id: 'skill_123',
      name: 'Updated Skill',
      repositoryUrl: '',
    });

    expect(result.id).toBe('skill_123');
    expect(result.repositoryUrl).toBeUndefined();
  });

  it('validates createSkillSchema with default isPublic = true and isPaused = false', () => {
    const result = createSkillSchema.parse({
      slug: 'default-flags-skill',
      name: 'Default Flags Skill',
    });

    expect(result.isPublic).toBe(true);
    expect(result.isPaused).toBe(false);
  });

  it('validates updateSkillSchema allowing toggling isPublic and isPaused', () => {
    const result = updateSkillSchema.parse({
      id: 'skill_123',
      isPublic: false,
      isPaused: true,
    });

    expect(result.id).toBe('skill_123');
    expect(result.isPublic).toBe(false);
    expect(result.isPaused).toBe(true);
  });
});
