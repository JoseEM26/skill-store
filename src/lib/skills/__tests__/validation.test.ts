import path from 'path';
import { describe, it, expect } from 'vitest';
import { parseSkillMarkdown, validateSkillFile } from '../validation';

describe('SKILL.md validation', () => {
  it('parses valid SKILL.md with all required frontmatter fields', () => {
    const markdown = `---
name: my-sample-skill
version: 1.0.0
description: A powerful sample skill for testing
author: testuser
license: MIT
repository: https://github.com/testuser/my-sample-skill
---

# My Sample Skill Body

Instructions for using the skill.
`;

    const result = parseSkillMarkdown(markdown);
    expect(result.slug).toBe('my-sample-skill');
    expect(result.frontmatter.name).toBe('my-sample-skill');
    expect(result.frontmatter.version).toBe('1.0.0');
    expect(result.frontmatter.description).toBe('A powerful sample skill for testing');
    expect(result.frontmatter.author).toBe('testuser');
    expect(result.frontmatter.license).toBe('MIT');
    expect(result.frontmatter.repository).toBe('https://github.com/testuser/my-sample-skill');
    expect(result.body).toContain('# My Sample Skill Body');
  });

  it('throws error when frontmatter is missing required fields (e.g. missing version)', () => {
    const markdown = `---
name: incomplete-skill
description: Missing version and author
---
Body content
`;

    expect(() => parseSkillMarkdown(markdown)).toThrowError(/Frontmatter inválido/);
  });

  it('throws error when frontmatter has invalid semver format', () => {
    const markdown = `---
name: invalid-version-skill
version: not-a-version
description: Some description
author: testuser
license: MIT
repository: https://github.com/testuser/repo
---
`;

    expect(() => parseSkillMarkdown(markdown)).toThrowError(/SemVer válido/);
  });

  it('throws error when YAML frontmatter is malformed', () => {
    const markdown = `---
name: [broken yaml
description: "unclosed string
---
`;

    expect(() => parseSkillMarkdown(markdown)).toThrowError(/Error de sintaxis YAML/);
  });

  it('throws error when no frontmatter is present', () => {
    const markdown = `# Just a title with no frontmatter`;

    expect(() => parseSkillMarkdown(markdown)).toThrowError(/no contiene un bloque frontmatter YAML válido/);
  });

  it('reads all files in a multi-file skill directory (e.g. manual-desarrollo)', () => {
    const skillPath = path.resolve(process.cwd(), 'skills/manual-desarrollo/SKILL.md');
    const result = validateSkillFile(skillPath);

    expect(result.valid).toBe(true);
    expect(result.skill).toBeDefined();
    expect(result.skill?.files).toBeDefined();
    expect(Object.keys(result.skill?.files || {})).toContain('SKILL.md');
    expect(Object.keys(result.skill?.files || {})).toContain('plantilla-visual.html');
    expect(result.skill?.files?.['plantilla-visual.html']).toContain('DOCTYPE html');
  });
});
