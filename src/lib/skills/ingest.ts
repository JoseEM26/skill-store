import { prisma } from '../prisma';
import { ParsedSkill, validateAllSkills } from './validation';
import { compareVersions, sortVersionsDesc } from './semver';

export interface IngestOptions {
  ownerUsername?: string;
  githubId?: string;
  changelog?: string;
  gitTag?: string;
}

export interface IngestSkillResult {
  success: boolean;
  skillId?: string;
  versionId?: string;
  slug: string;
  version: string;
  action: 'created' | 'version_added' | 'skipped_existing_version' | 'error';
  error?: string;
}

/**
 * Finds or creates a User entity by githubId / username.
 */
export async function getOrCreateUser(username: string, githubId?: string) {
  const gId = githubId || `gh_${username.toLowerCase()}`;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ githubId: gId }, { username }],
    },
  });

  if (existing) {
    return existing;
  }

  return await prisma.user.create({
    data: {
      githubId: gId,
      username,
      avatarUrl: `https://github.com/${username}.png`,
    },
  });
}

/**
 * Ingests a parsed skill and its version into PostgreSQL using atomic transaction.
 */
export async function ingestSkill(
  parsedSkill: ParsedSkill,
  options?: IngestOptions
): Promise<IngestSkillResult> {
  const authorName = options?.ownerUsername || parsedSkill.frontmatter.author || 'default-owner';
  const newVersion = parsedSkill.frontmatter.version;
  const slug = parsedSkill.slug;

  try {
    const owner = await getOrCreateUser(authorName, options?.githubId);

    return await prisma.$transaction(async (tx) => {
      // 1. Find existing skill for this owner and slug
      const existingSkill = await tx.skill.findUnique({
        where: {
          ownerId_slug: {
            ownerId: owner.id,
            slug,
          },
        },
        include: {
          versions: true,
        },
      });

      let skillRecord;
      let action: 'created' | 'version_added' | 'skipped_existing_version' = 'created';

      if (!existingSkill) {
        // Create new Skill
        skillRecord = await tx.skill.create({
          data: {
            slug,
            name: parsedSkill.frontmatter.name,
            description: parsedSkill.frontmatter.description,
            ownerId: owner.id,
            license: parsedSkill.frontmatter.license,
            repositoryUrl: parsedSkill.frontmatter.repository,
          },
        });
        action = 'created';
      } else {
        // Update Skill metadata
        skillRecord = await tx.skill.update({
          where: { id: existingSkill.id },
          data: {
            name: parsedSkill.frontmatter.name,
            description: parsedSkill.frontmatter.description,
            license: parsedSkill.frontmatter.license,
            repositoryUrl: parsedSkill.frontmatter.repository,
          },
        });

        // Check versions against max published version
        if (existingSkill.versions.length > 0) {
          const versionsList = existingSkill.versions.map((v) => v.version);
          const sortedVersions = sortVersionsDesc(versionsList);
          const maxVersion = sortedVersions[0];

          const cmp = compareVersions(newVersion, maxVersion);

          if (cmp < 0) {
            // New version is strictly lower than the max published version -> REJECT
            return {
              success: false,
              slug,
              version: newVersion,
              action: 'error',
              error: `Regresión de versión: La versión ${newVersion} es menor que la versión máxima ya publicada (${maxVersion})`,
            };
          }

          if (cmp === 0) {
            // Exactly the same version that is already the highest -> IDEMPOTENT SKIP
            const existingVersion = existingSkill.versions.find((v) => v.version === newVersion);
            return {
              success: true,
              skillId: skillRecord.id,
              versionId: existingVersion?.id,
              slug,
              version: newVersion,
              action: 'skipped_existing_version',
            };
          }
        }

        action = 'version_added';
      }

      // 2. Insert SkillVersion
      const gitTag = options?.gitTag || `${slug}-v${newVersion}`;
      const changelog = options?.changelog || `Publicación de versión ${newVersion}`;

      const versionRecord = await tx.skillVersion.create({
        data: {
          skillId: skillRecord.id,
          version: newVersion,
          changelog,
          gitTag,
        },
      });

      return {
        success: true,
        skillId: skillRecord.id,
        versionId: versionRecord.id,
        slug,
        version: newVersion,
        action,
      };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      slug,
      version: newVersion,
      action: 'error',
      error: message,
    };
  }
}

/**
 * Ingests all valid skills found in skillsDir.
 */
export async function ingestAllSkills(
  skillsDir: string,
  options?: IngestOptions
): Promise<{
  total: number;
  results: IngestSkillResult[];
  successCount: number;
  errorCount: number;
}> {
  const validationSummary = validateAllSkills(skillsDir);
  const results: IngestSkillResult[] = [];

  for (const item of validationSummary.results) {
    if (item.valid && item.skill) {
      const res = await ingestSkill(item.skill, options);
      results.push(res);
    } else {
      results.push({
        success: false,
        slug: item.filePath || 'unknown',
        version: 'unknown',
        action: 'error',
        error: item.errors?.join(', ') || 'Validación de archivo fallida',
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  return {
    total: results.length,
    results,
    successCount,
    errorCount,
  };
}
