import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import { isValidSemver } from './semver';

/**
 * Zod schema for SKILL.md YAML frontmatter.
 * Requires: name, version, description, author, license, repository.
 */
export const SkillFrontmatterSchema = z.object({
  name: z
    .string({ message: 'El campo "name" es obligatorio' })
    .min(1, 'El campo "name" no puede estar vacío')
    .regex(/^[a-z0-9-_]+$/i, 'El nombre debe contener solo letras, números, guiones y guiones bajos'),
  version: z
    .string({ message: 'El campo "version" es obligatorio' })
    .min(1, 'El campo "version" no puede estar vacío')
    .refine((v) => isValidSemver(v), {
      message: 'El campo "version" debe ser un formato SemVer válido (ej. 1.0.0)',
    }),
  description: z
    .string({ message: 'El campo "description" es obligatorio' })
    .min(1, 'El campo "description" no puede estar vacío'),
  author: z
    .string({ message: 'El campo "author" es obligatorio' })
    .min(1, 'El campo "author" no puede estar vacío'),
  license: z
    .string({ message: 'El campo "license" es obligatorio' })
    .min(1, 'El campo "license" no puede estar vacío'),
  repository: z
    .string({ message: 'El campo "repository" es obligatorio' })
    .min(1, 'El campo "repository" no puede estar vacío'),
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export interface ParsedSkill {
  slug: string;
  frontmatter: SkillFrontmatter;
  body: string;
  filePath?: string;
}

export interface ValidationResult {
  valid: boolean;
  skill?: ParsedSkill;
  errors?: string[];
  filePath?: string;
}

/**
 * Parses raw markdown content of a SKILL.md file and validates its frontmatter.
 */
export function parseSkillMarkdown(content: string, filePath?: string): ParsedSkill {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Error de sintaxis YAML en el frontmatter: ${message}`);
  }

  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    throw new Error('El archivo SKILL.md no contiene un bloque frontmatter YAML válido');
  }

  const result = SkillFrontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Frontmatter inválido: ${errorDetails}`);
  }

  // Derive slug from frontmatter name
  const slug = result.data.name;

  return {
    slug,
    frontmatter: result.data,
    body: parsed.content.trim(),
    filePath,
  };
}

/**
 * Validates a single SKILL.md file from disk.
 */
export function validateSkillFile(filePath: string): ValidationResult {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        errors: [`El archivo no existe: ${filePath}`],
        filePath,
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const skill = parseSkillMarkdown(content, filePath);
    return {
      valid: true,
      skill,
      filePath,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      errors: [message],
      filePath,
    };
  }
}

/**
 * Discovers and validates all SKILL.md files under a directory (e.g. skills/).
 */
export function validateAllSkills(skillsDir: string): {
  total: number;
  validCount: number;
  invalidCount: number;
  results: ValidationResult[];
} {
  if (!fs.existsSync(skillsDir)) {
    return { total: 0, validCount: 0, invalidCount: 0, results: [] };
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const results: ValidationResult[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillMdPath)) {
        results.push(validateSkillFile(skillMdPath));
      }
    }
  }

  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid).length;

  return {
    total: results.length,
    validCount,
    invalidCount,
    results,
  };
}
