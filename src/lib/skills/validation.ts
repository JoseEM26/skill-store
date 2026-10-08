import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import { isValidSemver } from './semver';

/**
 * Required heading sections that must exist in this exact order in the SKILL.md body.
 */
export const REQUIRED_SKILL_SECTIONS = [
  '## 1. Propósito y Cuándo Usar',
  '## 2. Flujo de Trabajo (Workflow)',
  '## 3. Reglas y Restricciones (Criterios de Diseño)',
  '## 4. Árbol de Decisión (Si aplica)',
  '## 5. Ejemplos Ejecutables',
  '## 6. Manejo de Errores y Casos Excepcionales',
] as const;

/**
 * Zod schema for SKILL.md YAML frontmatter.
 * Required: name, description.
 * Optional: license, compatibility, metadata.
 * metadata.version defaults to "1.0.0" if omitted, but must be valid SemVer if present.
 */
export const SkillFrontmatterSchema = z
  .object({
    name: z
      .string({ message: 'El campo "name" es obligatorio' })
      .min(1, 'El campo "name" no puede estar vacío')
      .regex(/^[a-z0-9-_]+$/i, 'El nombre debe contener solo letras, números, guiones y guiones bajos'),
    description: z
      .string({ message: 'El campo "description" es obligatorio' })
      .min(1, 'El campo "description" no puede estar vacío'),
    license: z
      .string()
      .min(1, 'El campo "license" no puede estar vacío')
      .optional(),
    compatibility: z
      .string()
      .min(1, 'El campo "compatibility" no puede estar vacío')
      .optional(),
    metadata: z
      .object({
        version: z
          .string()
          .optional(),
        author: z
          .string()
          .min(1, 'El campo "metadata.author" no puede estar vacío')
          .optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.metadata?.version !== undefined && !isValidSemver(data.metadata.version)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El campo "metadata.version" debe ser un formato SemVer válido (ej. 1.0.0)',
        path: ['metadata', 'version'],
      });
    }
  })
  .transform((data) => {
    const metadata: { version: string; author?: string } = {
      version: data.metadata?.version || '1.0.0',
      author: data.metadata?.author,
    };
    return {
      ...data,
      metadata,
    };
  });

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export interface ParsedSkill {
  slug: string;
  frontmatter: SkillFrontmatter;
  body: string;
  filePath?: string;
  files?: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  skill?: ParsedSkill;
  errors?: string[];
  filePath?: string;
}

export interface BodyValidationResult {
  valid: boolean;
  error?: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates that the body contains the 6 required headings in the exact specified order.
 */
export function validateSkillBodySections(body: string): BodyValidationResult {
  const missingSections: string[] = [];
  const foundPositions: { section: string; index: number }[] = [];

  for (const section of REQUIRED_SKILL_SECTIONS) {
    const regex = new RegExp(`^${escapeRegex(section)}\\s*$`, 'm');
    const match = regex.exec(body);
    if (!match) {
      missingSections.push(section);
    } else {
      foundPositions.push({ section, index: match.index });
    }
  }

  if (missingSections.length > 0) {
    return {
      valid: false,
      error: `Faltan las siguientes secciones obligatorias en el cuerpo: ${missingSections.map((s) => `"${s}"`).join(', ')}`,
    };
  }

  for (let i = 0; i < foundPositions.length - 1; i++) {
    if (foundPositions[i].index > foundPositions[i + 1].index) {
      return {
        valid: false,
        error: `Las secciones del cuerpo están fuera de orden: "${foundPositions[i + 1].section}" aparece antes de "${foundPositions[i].section}". El orden requerido es:\n${REQUIRED_SKILL_SECTIONS.join('\n')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Reads all files within a skill directory recursively.
 * Returns a map of relative path (posix) -> file content.
 */
export function readSkillDirectoryFiles(dirPath: string): Record<string, string> {
  const files: Record<string, string> = {};

  function scan(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile()) {
        const relPath = path.relative(dirPath, fullPath).split(path.sep).join('/');
        files[relPath] = fs.readFileSync(fullPath, 'utf-8');
      }
    }
  }

  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    scan(dirPath);
  }

  return files;
}

/**
 * Patterns for detecting prompt injection and malicious instructions in skills.
 */
const INSTRUCTION_OVERRIDE_PATTERNS = [
  /\b(?:ignore|disregard|forget|bypass)\s+(?:all\s+|the\s+)?(?:previous|prior|above|earlier)\s+(?:instructions|prompts|directives|commands)\b/i,
  /\bdisregard\s+(?:the\s+)?above\b/i,
  /\byou\s+are\s+now\b/i,
  /\b(?:ignora|olvida|desestima|olv[ií]date\s+de)\s+(?:todo\s+lo\s+anterior|(?:todas?\s+)?(?:las\s+)?(?:instrucciones\s+(?:anteriores|previas)|anteriores\s+instrucciones))\b/i,
];

const EXFILTRATION_VERBS =
  '(?:mostrar|mostr[aá]|muestr[ae]s?|mostrame|mostrad[oa]s?|imprimir|imprim[ií]|imprim[ae]s?|imprimime|impres[oa]s?|enviar|env[ií][ae]s?|enviad[oa]s?|mandar|mand[aá]|mand[ae]s?|mandad[oa]s?|print(?:s|ing|ed)?|send(?:s|ing)?|sent|exfiltrat(?:e|es|ing|ed|ion)|leak(?:s|ing|ed)?|dump(?:s|ing|ed)?)';

const EXFILTRATION_TARGETS =
  '(?:\\bprocess\\.env|\\.env\\b|\\bauth[_-]?secrets?|\\bapi[_-]?keys?|\\bsecrets?|\\btokens?|\\bvariables?\\s+de\\s+entorno|\\benvironment\\s+variables?|\\benv\\b)';

const EXFILTRATION_PATTERNS = [
  new RegExp(`\\b${EXFILTRATION_VERBS}\\b[^\\n.?!;:]{0,50}?${EXFILTRATION_TARGETS}`, 'i'),
  new RegExp(`${EXFILTRATION_TARGETS}[^\\n.?!;:]{0,50}?\\b${EXFILTRATION_VERBS}\\b`, 'i'),
];

const DESTRUCTIVE_COMMAND_PATTERNS = [
  /\brm\s+-(?:[a-zA-Z]*r[a-zA-Z]*f|[a-zA-Z]*f[a-zA-Z]*r)\b/i,
  /\brm\s+-(?:r\s+-f|f\s+-r)\b/i,
  /\bDROP\s+(?:TABLE|DATABASE)\b/i,
  /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
  /\bmkfs(?:\.[a-z0-9_-]+)?\b/i,
  /\bdd\s+(?:[^\n]*\s)?if=/i,
];

const INVISIBLE_UNICODE_PATTERN = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u180E]/u;

const SUSPICIOUS_BASE64_PATTERN = /[A-Za-z0-9+/=]{100,}/;

export interface PromptInjectionDetectionResult {
  detected: boolean;
  reason?: string;
}

/**
 * Heuristic detector for prompt injection and malicious instructions in skill content.
 */
export function detectPromptInjectionPatterns(content: string): PromptInjectionDetectionResult {
  for (const pattern of INSTRUCTION_OVERRIDE_PATTERNS) {
    if (pattern.test(content)) {
      return {
        detected: true,
        reason: 'Frase de anulación de instrucciones detectada',
      };
    }
  }

  for (const pattern of EXFILTRATION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        detected: true,
        reason: 'Instrucción de exfiltración de secretos o variables de entorno detectada',
      };
    }
  }

  for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
    if (pattern.test(content)) {
      return {
        detected: true,
        reason: 'Comando destructivo de shell detectado',
      };
    }
  }

  if (INVISIBLE_UNICODE_PATTERN.test(content)) {
    return {
      detected: true,
      reason: 'Caracteres Unicode invisibles o de ancho cero detectados',
    };
  }

  // Strip code blocks with explicit language tags (e.g. ```bash ... ```)
  const withoutExplicitCodeBlocks = content.replace(
    /^[ \t]*(?:`{3,})[a-zA-Z0-9_-]+[^\n]*\n[\s\S]*?^[ \t]*(?:`{3,})/gm,
    ''
  );
  // Strip URLs to avoid false positives on long URLs
  const withoutUrls = withoutExplicitCodeBlocks.replace(/https?:\/\/[^\s)\]]+/gi, '');

  if (SUSPICIOUS_BASE64_PATTERN.test(withoutUrls)) {
    return {
      detected: true,
      reason: 'Bloque base64 sospechoso detectado fuera de bloque de código con lenguaje explícito',
    };
  }

  return { detected: false };
}

/**
 * Parses raw markdown content of a SKILL.md file and validates its frontmatter and body structure.
 */
export function parseSkillMarkdown(content: string, filePath?: string): ParsedSkill {
  const injectionResult = detectPromptInjectionPatterns(content);
  if (injectionResult.detected) {
    throw new Error(
      'El contenido fue rechazado por contener un patrón asociado a instrucciones maliciosas (prompt injection). Revisá el contenido y volvé a intentarlo.'
    );
  }

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

  let files: Record<string, string> | undefined;
  if (filePath && fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    const dir = stat.isDirectory() ? filePath : path.dirname(filePath);
    if (fs.existsSync(dir)) {
      files = readSkillDirectoryFiles(dir);
    }
  }

  return {
    slug,
    frontmatter: result.data,
    body: parsed.content.trim(),
    filePath,
    files,
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
    const skillDir = path.dirname(filePath);
    skill.files = readSkillDirectoryFiles(skillDir);
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
