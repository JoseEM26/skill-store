import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import semver from 'semver';
import { sortVersionsDesc } from '@/lib/skills/semver';
import { validateAccessToken } from '@/lib/auth/tokens';
import { incrementInstallsCount } from '@/lib/catalog/counters';
import { z } from 'zod';
import { withAuthenticatedTool } from './auth';
import {
  createContextMcpSchema,
  updateContextMcpSchema,
  deleteContextMcpSchema,
  publishSkillMcpSchema,
  deleteSkillMcpSchema,
} from '@/lib/validations/mcp';
import { parseSkillMarkdown, ParsedSkill } from '@/lib/skills/validation';
import { getUserGroups } from '@/lib/admin/groups';

export {
  createContextMcpSchema,
  updateContextMcpSchema,
  deleteContextMcpSchema,
  publishSkillMcpSchema,
  deleteSkillMcpSchema,
};

// --- ZOD SCHEMAS FOR MCP TOOLS ---

export const listSkillsInputSchema = z.object({
  limit: z.number().int().positive().max(100).optional().default(50),
  query: z.string().optional(),
  token: z.string().optional(),
});

export const searchSkillsInputSchema = z.object({
  query: z.string().trim().min(1, 'El término de búsqueda es requerido'),
  limit: z.number().int().positive().max(100).optional().default(20),
  token: z.string().optional(),
});

export const getSkillInputSchema = z.object({
  owner: z.string().trim().min(1, 'El owner es requerido'),
  slug: z.string().trim().min(1, 'El slug es requerido'),
  token: z.string().optional(),
});

export const installSkillInputSchema = z.object({
  owner: z.string().trim().min(1, 'El owner es requerido'),
  slug: z.string().trim().min(1, 'El slug es requerido'),
});

export const getVersionInputSchema = z.object({
  owner: z.string().trim().min(1, 'El owner es requerido'),
  slug: z.string().trim().min(1, 'El slug es requerido'),
  version: z.string().trim().min(1, 'La versión es requerida'),
  token: z.string().optional(),
});

export const checkUpdatesInputSchema = z.object({
  owner: z.string().trim().min(1, 'El owner es requerido'),
  slug: z.string().trim().min(1, 'El slug es requerido'),
  currentVersion: z.string().trim().min(1, 'La versión actual es requerida'),
});

export const listContextsInputSchema = z.object({
  token: z.string().optional(),
  type: z.enum(['all', 'idea', 'external_reference']).optional().default('all'),
});

export const getContextInputSchema = z.object({
  id: z.string().trim().min(1, 'El ID de contexto es requerido'),
  token: z.string().optional(),
});

export const getMySetupInputSchema = z.object({
  token: z.string().trim().min(1, 'El token de acceso es requerido'),
});

export const listGroupsInputSchema = z.object({
  token: z.string().optional(),
});

export const getGroupInputSchema = z
  .object({
    name: z.string().trim().optional(),
    groupId: z.string().trim().optional(),
    id: z.string().trim().optional(),
    token: z.string().optional(),
  })
  .refine((data) => Boolean(data.name || data.groupId || data.id), {
    message: 'Se requiere el nombre o ID del grupo',
  });

// Helper to extract Bearer token from header
export function extractBearerToken(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// --- MCP TOOL IMPLEMENTATIONS ---

/**
 * 1. list_skills: Lists public active skills with their latest version, plus owner's private/paused skills if authenticated.
 */
export async function handleListSkills(
  input: z.input<typeof listSkillsInputSchema> = {},
  bearerToken?: string | null
) {
  const validated = listSkillsInputSchema.parse(input);
  const rawToken = validated.token || bearerToken;

  let ownerId: string | null = null;
  if (rawToken) {
    const authResult = await validateAccessToken(rawToken, 'read');
    if (authResult.valid) {
      ownerId = authResult.user.id;
    }
  }

  const where: Prisma.SkillWhereInput = {
    isArchived: false,
    ...(ownerId
      ? {
          OR: [
            { isPublic: true, isPaused: false },
            { ownerId },
          ],
        }
      : {
          isPublic: true,
          isPaused: false,
        }),
  };

  if (validated.query) {
    where.AND = [
      {
        OR: [
          { name: { contains: validated.query, mode: 'insensitive' } },
          { slug: { contains: validated.query, mode: 'insensitive' } },
          { description: { contains: validated.query, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const skills = await prisma.skill.findMany({
    where,
    take: validated.limit,
    include: {
      owner: { select: { username: true, avatarUrl: true } },
      versions: { orderBy: { publishedAt: 'desc' } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return skills.map((s) => {
    let latestVersion = null;
    if (s.versions.length > 0) {
      const sorted = sortVersionsDesc(s.versions.map((v) => v.version));
      const topVer = sorted[0];
      const verObj = s.versions.find((v) => v.version === topVer) || s.versions[0];
      latestVersion = {
        version: verObj.version,
        publishedAt: verObj.publishedAt,
        changelog: verObj.changelog,
        gitTag: verObj.gitTag,
      };
    }

    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      license: s.license,
      repositoryUrl: s.repositoryUrl,
      isPublic: s.isPublic,
      isPaused: s.isPaused,
      owner: s.owner.username,
      latestVersion,
      downloadsCount: s.downloadsCount,
      installsCount: s.installsCount,
      installCommand: `npx skills add ${s.owner.username}/${s.slug}`,
    };
  });
}

/**
 * 2. search_skills: Searches skills across name, description, slug, and versions.
 */
export async function handleSearchSkills(
  input: z.input<typeof searchSkillsInputSchema>,
  bearerToken?: string | null
) {
  const validated = searchSkillsInputSchema.parse(input);
  return await handleListSkills(
    { limit: validated.limit, query: validated.query, token: validated.token },
    bearerToken
  );
}

/**
 * 3. get_skill: Fetches full detail of a skill including complete version history.
 */
export async function handleGetSkill(
  input: z.input<typeof getSkillInputSchema>,
  bearerToken?: string | null
) {
  const validated = getSkillInputSchema.parse(input);
  const rawToken = validated.token || bearerToken;

  let ownerId: string | null = null;
  if (rawToken) {
    const authResult = await validateAccessToken(rawToken, 'read');
    if (authResult.valid) {
      ownerId = authResult.user.id;
    }
  }

  const skill = await prisma.skill.findFirst({
    where: {
      slug: validated.slug,
      owner: { username: validated.owner },
      ...(ownerId
        ? {
            OR: [
              { isPublic: true, isPaused: false },
              { ownerId },
            ],
          }
        : {
            isPublic: true,
            isPaused: false,
          }),
    },
    include: {
      owner: { select: { username: true, avatarUrl: true } },
      versions: { orderBy: { publishedAt: 'desc' } },
    },
  });

  if (!skill) {
    throw new Error(`Skill '${validated.owner}/${validated.slug}' no encontrada.`);
  }

  const sortedVersions = [...skill.versions].sort((a, b) => {
    const list = sortVersionsDesc([a.version, b.version]);
    return list[0] === a.version ? -1 : 1;
  });

  const latestVersion = sortedVersions[0] || null;

  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    license: skill.license,
    repositoryUrl: skill.repositoryUrl,
    owner: skill.owner.username,
    isArchived: skill.isArchived,
    isPublic: skill.isPublic,
    isPaused: skill.isPaused,
    installCommand: `npx skills add ${skill.owner.username}/${skill.slug}`,
    downloadsCount: skill.downloadsCount,
    installsCount: skill.installsCount,
    latestVersion: latestVersion
      ? {
          version: latestVersion.version,
          changelog: latestVersion.changelog,
          gitTag: latestVersion.gitTag,
          files: latestVersion.files ?? null,
          publishedAt: latestVersion.publishedAt,
        }
      : null,
    versions: sortedVersions.map((v) => ({
      version: v.version,
      changelog: v.changelog,
      gitTag: v.gitTag,
      files: v.files ?? null,
      publishedAt: v.publishedAt,
    })),
  };
}

/**
 * 4. get_version: Fetches specific version details, changelog, gitTag, and files.
 */
export async function handleGetVersion(
  input: z.input<typeof getVersionInputSchema>,
  bearerToken?: string | null
) {
  const validated = getVersionInputSchema.parse(input);
  const rawToken = validated.token || bearerToken;

  let ownerId: string | null = null;
  if (rawToken) {
    const authResult = await validateAccessToken(rawToken, 'read');
    if (authResult.valid) {
      ownerId = authResult.user.id;
    }
  }

  const skill = await prisma.skill.findFirst({
    where: {
      slug: validated.slug,
      owner: { username: validated.owner },
      ...(ownerId
        ? {
            OR: [
              { isPublic: true, isPaused: false },
              { ownerId },
            ],
          }
        : {
            isPublic: true,
            isPaused: false,
          }),
    },
    include: {
      owner: { select: { username: true } },
      versions: { where: { version: validated.version } },
    },
  });

  if (!skill || skill.versions.length === 0) {
    throw new Error(
      `Versión '${validated.version}' de la skill '${validated.owner}/${validated.slug}' no encontrada.`
    );
  }

  const ver = skill.versions[0];

  return {
    skill: {
      owner: skill.owner.username,
      slug: skill.slug,
      name: skill.name,
    },
    version: ver.version,
    changelog: ver.changelog,
    gitTag: ver.gitTag,
    files: ver.files ?? null,
    publishedAt: ver.publishedAt,
  };
}

/**
 * 5. check_updates: Compares installed version against latest version in registry.
 */
export async function handleCheckUpdates(input: z.input<typeof checkUpdatesInputSchema>) {
  const validated = checkUpdatesInputSchema.parse(input);

  const skill = await prisma.skill.findFirst({
    where: {
      slug: validated.slug,
      owner: { username: validated.owner },
    },
    include: {
      versions: true,
    },
  });

  if (!skill || skill.versions.length === 0) {
    throw new Error(`Skill '${validated.owner}/${validated.slug}' no encontrada.`);
  }

  const sortedVersions = sortVersionsDesc(skill.versions.map((v) => v.version));
  const latestVerString = sortedVersions[0];
  const latestVerObj = skill.versions.find((v) => v.version === latestVerString);

  const currentValid = semver.valid(validated.currentVersion);
  const latestValid = semver.valid(latestVerString);

  let hasUpdate = false;
  if (currentValid && latestValid) {
    hasUpdate = semver.gt(latestValid, currentValid);
  } else {
    hasUpdate = latestVerString !== validated.currentVersion;
  }

  return {
    skill: `${validated.owner}/${validated.slug}`,
    currentVersion: validated.currentVersion,
    latestVersion: latestVerString,
    hasUpdate,
    changelog: hasUpdate ? latestVerObj?.changelog : null,
    gitTag: hasUpdate ? latestVerObj?.gitTag : null,
  };
}

/**
 * 6. list_contexts: Lists public contexts, plus private ideas owned by the token holder (if authenticated).
 * STRICT: Excludes private ideas of other users.
 */
export async function handleListContexts(
  input: z.input<typeof listContextsInputSchema> = {},
  bearerToken?: string | null
) {
  const validated = listContextsInputSchema.parse(input);
  const rawToken = validated.token || bearerToken;

  let ownerId: string | null = null;
  if (rawToken) {
    const authResult = await validateAccessToken(rawToken, 'read');
    if (authResult.valid) {
      ownerId = authResult.user.id;
    }
  }

  const typeFilter = validated.type;

  const contexts = await prisma.context.findMany({
    where: {
      isArchived: false,
      ...(ownerId
        ? {
            OR: [{ isPublic: true }, { ownerId }],
          }
        : {
            isPublic: true,
          }),
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    },
    include: {
      owner: { select: { username: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return contexts.map((c) => ({
    id: c.id,
    type: c.type,
    title: c.title,
    body: c.body,
    link: c.link,
    tags: c.tags,
    isPublic: c.isPublic,
    owner: c.owner.username,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

/**
 * 7. get_context: Retrieves a context by ID. Private ideas require token of the owner.
 */
export async function handleGetContext(
  input: z.input<typeof getContextInputSchema>,
  bearerToken?: string | null
) {
  const validated = getContextInputSchema.parse(input);
  const rawToken = validated.token || bearerToken;

  const context = await prisma.context.findUnique({
    where: { id: validated.id },
    include: {
      owner: { select: { id: true, username: true } },
    },
  });

  if (!context || context.isArchived) {
    throw new Error(`Contexto con ID '${validated.id}' no encontrado.`);
  }

  if (!context.isPublic) {
    if (!rawToken) {
      throw new Error(`Acceso no autorizado: este contexto es privado.`);
    }

    const authResult = await validateAccessToken(rawToken, 'read');
    if (!authResult.valid || authResult.user.id !== context.owner.id) {
      throw new Error(`Acceso no autorizado: no tienes permiso para ver este contexto privado.`);
    }
  }

  return {
    id: context.id,
    type: context.type,
    title: context.title,
    body: context.body,
    link: context.link,
    tags: context.tags,
    isPublic: context.isPublic,
    owner: context.owner.username,
    createdAt: context.createdAt,
    updatedAt: context.updatedAt,
  };
}

/**
 * 8. get_my_setup: Consolidates all skills and contexts for the authenticated user in one turn.
 * Requires valid token with 'read' scope.
 */
export async function handleGetMySetup(
  input: z.input<typeof getMySetupInputSchema> | { token?: string } = {},
  bearerToken?: string | null
) {
  const rawToken = input.token || bearerToken;
  if (!rawToken) {
    throw new Error('Token de acceso requerido con scope read para inicializar setup.');
  }

  const authResult = await validateAccessToken(rawToken, 'read');
  if (!authResult.valid) {
    throw new Error(`Autenticación fallida: ${authResult.message}`);
  }

  const userId = authResult.user.id;

  const [userRecord, userSkills, userContexts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, githubId: true, avatarUrl: true },
    }),
    prisma.skill.findMany({
      where: { ownerId: userId, isArchived: false },
      include: {
        versions: { orderBy: { publishedAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.context.findMany({
      where: { ownerId: userId, isArchived: false },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const ideas = userContexts.filter((c) => c.type === 'idea');
  const externalReferences = userContexts.filter((c) => c.type === 'external_reference');

  const formattedSkills = userSkills.map((s) => {
    const sorted = sortVersionsDesc(s.versions.map((v) => v.version));
    const topVer = sorted[0];
    const verObj = s.versions.find((v) => v.version === topVer) || s.versions[0];

    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      license: s.license,
      repositoryUrl: s.repositoryUrl,
      isPublic: s.isPublic,
      isPaused: s.isPaused,
      downloadsCount: s.downloadsCount,
      installsCount: s.installsCount,
      latestVersion: verObj
        ? {
            version: verObj.version,
            changelog: verObj.changelog,
            gitTag: verObj.gitTag,
          }
        : null,
      installCommand: `npx skills add ${userRecord?.username}/${s.slug}`,
    };
  });

  return {
    user: {
      id: userRecord?.id,
      username: userRecord?.username,
      githubId: userRecord?.githubId,
      avatarUrl: userRecord?.avatarUrl,
    },
    skills: formattedSkills,
    contexts: {
      ideas: ideas.map((i) => ({
        id: i.id,
        title: i.title,
        body: i.body,
        tags: i.tags,
        isPublic: i.isPublic,
        createdAt: i.createdAt,
      })),
      externalReferences: externalReferences.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        link: r.link,
        tags: r.tags,
        isPublic: r.isPublic,
        createdAt: r.createdAt,
      })),
    },
  };
}

/**
 * 9. create_context: Creates idea or external_reference.
 * Requires scope 'write'.
 * ownerId is derived strictly from verified token.
 * isPublic defaults to false for idea, forced to true for external_reference.
 */
export const handleCreateContext = withAuthenticatedTool(
  'write',
  async (input: z.input<typeof createContextMcpSchema>, ctx) => {
    const data = createContextMcpSchema.parse(input);
    const isPublic = data.type === 'external_reference' ? true : (data.isPublic ?? false);

    const context = await prisma.context.create({
      data: {
        type: data.type,
        title: data.title,
        body: data.body || null,
        link: data.link || null,
        tags: data.tags,
        isPublic,
        ownerId: ctx.ownerId,
      },
    });

    return {
      id: context.id,
      type: context.type,
      title: context.title,
      body: context.body,
      link: context.link,
      tags: context.tags,
      isPublic: context.isPublic,
      owner: ctx.user.username,
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
    };
  }
);

/**
 * 10. update_context: Updates context owned by token holder.
 * Requires scope 'write'.
 * Validates ownership (ownerId === token.ownerId).
 */
export const handleUpdateContext = withAuthenticatedTool(
  'write',
  async (input: z.input<typeof updateContextMcpSchema>, ctx) => {
    const data = updateContextMcpSchema.parse(input);

    const existing = await prisma.context.findFirst({
      where: { id: data.id, ownerId: ctx.ownerId },
    });

    if (!existing) {
      throw new Error('Recurso no encontrado o no pertenece a tu usuario');
    }

    if (existing.isArchived) {
      throw new Error('El contexto está archivado y no admite modificaciones');
    }

    const isPublic = existing.type === 'external_reference' ? true : (data.isPublic ?? existing.isPublic);

    const updated = await prisma.context.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.link !== undefined ? { link: data.link } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        isPublic,
      },
    });

    return {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      body: updated.body,
      link: updated.link,
      tags: updated.tags,
      isPublic: updated.isPublic,
      owner: ctx.user.username,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
);

/**
 * 11. delete_context: Deletes context owned by token holder.
 * Requires strictly scope 'delete'.
 * Validates ownership (ownerId === token.ownerId).
 */
export const handleDeleteContext = withAuthenticatedTool(
  'delete',
  async (input: z.input<typeof deleteContextMcpSchema>, ctx) => {
    const data = deleteContextMcpSchema.parse(input);

    const existing = await prisma.context.findFirst({
      where: { id: data.id, ownerId: ctx.ownerId },
    });

    if (!existing) {
      throw new Error('Recurso no encontrado o no pertenece a tu usuario');
    }

    if (existing.isArchived) {
      throw new Error('El contexto está archivado y no admite eliminación');
    }

    await prisma.context.delete({
      where: { id: data.id },
    });

    return {
      success: true,
      id: data.id,
      message: 'Contexto eliminado exitosamente',
    };
  }
);

/**
 * 12. publish_skill: Creates or updates skill owned by token holder.
 * Requires scope 'write'.
 * Validates uniqueness of slug for token owner.
 */
export const handlePublishSkill = withAuthenticatedTool(
  'write',
  async (input: z.input<typeof publishSkillMcpSchema>, ctx) => {
    const data = publishSkillMcpSchema.parse(input);

    let parsedSkill: ParsedSkill | null = null;
    if (data.content !== undefined) {
      parsedSkill = parseSkillMarkdown(data.content);
    }

    const name = parsedSkill ? parsedSkill.frontmatter.name : data.name;
    const description = parsedSkill ? parsedSkill.frontmatter.description : (data.description || null);
    const license = parsedSkill ? (parsedSkill.frontmatter.license || 'MIT') : (data.license || 'MIT');

    if (data.id) {
      const existing = await prisma.skill.findFirst({
        where: { id: data.id, ownerId: ctx.ownerId },
      });

      if (!existing) {
        throw new Error('Skill no encontrada o no pertenece a tu usuario');
      }

      if (existing.isArchived) {
        throw new Error('La skill está archivada y no admite modificaciones');
      }

      const updated = await prisma.skill.update({
        where: { id: data.id },
        data: {
          name,
          description,
          license,
          repositoryUrl: data.repositoryUrl || null,
          ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
          ...(data.isPaused !== undefined ? { isPaused: data.isPaused } : {}),
        },
      });

      if (parsedSkill && data.content !== undefined) {
        const version = parsedSkill.frontmatter.metadata.version;
        await prisma.skillVersion.upsert({
          where: {
            skillId_version: {
              skillId: updated.id,
              version,
            },
          },
          create: {
            skillId: updated.id,
            version,
            files: { 'SKILL.md': data.content },
          },
          update: {
            files: { 'SKILL.md': data.content },
          },
        });
      }

      return {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        description: updated.description,
        license: updated.license,
        repositoryUrl: updated.repositoryUrl,
        isPublic: updated.isPublic,
        isPaused: updated.isPaused,
        owner: ctx.user.username,
        updatedAt: updated.updatedAt,
      };
    }

    try {
      const created = await prisma.skill.create({
        data: {
          slug: data.slug,
          name,
          description,
          license,
          repositoryUrl: data.repositoryUrl || null,
          isPublic: false,
          isPaused: data.isPaused ?? false,
          ownerId: ctx.ownerId,
          ...(parsedSkill && data.content !== undefined
            ? {
                versions: {
                  create: {
                    version: parsedSkill.frontmatter.metadata.version,
                    files: { 'SKILL.md': data.content },
                  },
                },
              }
            : {}),
        },
      });

      return {
        id: created.id,
        slug: created.slug,
        name: created.name,
        description: created.description,
        license: created.license,
        repositoryUrl: created.repositoryUrl,
        isPublic: created.isPublic,
        isPaused: created.isPaused,
        owner: ctx.user.username,
        downloadsCount: 0,
        installsCount: 0,
        createdAt: created.createdAt,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error(`Ya tienes una skill registrada con el slug "${data.slug}"`);
      }
      throw error;
    }
  }
);

export const handleUpdateSkill = handlePublishSkill;

/**
 * 13. delete_skill: Deletes skill owned by token holder.
 * Requires strictly scope 'delete'.
 * Validates ownership (ownerId === token.ownerId).
 */
export const handleDeleteSkill = withAuthenticatedTool(
  'delete',
  async (input: z.input<typeof deleteSkillMcpSchema>, ctx) => {
    const data = deleteSkillMcpSchema.parse(input);

    const existing = await prisma.skill.findFirst({
      where: {
        ownerId: ctx.ownerId,
        ...(data.id ? { id: data.id } : { slug: data.slug }),
      },
    });

    if (!existing) {
      throw new Error('Skill no encontrada o no pertenece a tu usuario');
    }

    if (existing.isArchived) {
      throw new Error('La skill está archivada y no admite eliminación');
    }

    if (data.confirm !== true) {
      const warningText = existing.isPublic
        ? 'Esta skill es pública. Se eliminará del registro, pero quienes ya la descargaron o instalaron conservan su copia local (el registro no puede revocar copias ya distribuidas).'
        : 'Esta skill es privada. Se eliminará del registro y, al no haber estado nunca en el catálogo público, no hay copias de terceros que considerar.';

      return {
        success: false as const,
        requiresConfirmation: true,
        id: existing.id,
        slug: existing.slug,
        name: existing.name,
        isPublic: existing.isPublic,
        message: `¿Estás seguro de que deseas eliminar permanentemente la skill "${existing.name}"? ${warningText} Para confirmar la eliminación definitiva, repite la llamada incluyendo { confirm: true }.`,
      };
    }

    await prisma.skill.delete({
      where: { id: existing.id },
    });

    return {
      success: true as const,
      id: existing.id,
      slug: existing.slug,
      message: 'Skill eliminada exitosamente',
    };
  }
);

/**
 * 14. install_skill: Increments installsCount and returns skill metadata and install command.
 * Public tool - no authentication required (ADR-0009).
 */
export async function handleInstallSkill(input: z.input<typeof installSkillInputSchema>) {
  const validated = installSkillInputSchema.parse(input);

  const updated = await incrementInstallsCount(validated.owner, validated.slug);
  if (!updated) {
    const existing = await prisma.skill.findFirst({
      where: {
        slug: validated.slug,
        owner: { username: validated.owner },
      },
      include: {
        owner: { select: { username: true } },
        versions: { orderBy: { publishedAt: 'desc' } },
      },
    });

    if (!existing) {
      throw new Error(`Skill '${validated.owner}/${validated.slug}' no encontrada.`);
    }

    const latestVersion = existing.versions[0]?.version || '1.0.0';

    return {
      success: true,
      skill: `${validated.owner}/${validated.slug}`,
      name: existing.name,
      version: latestVersion,
      installsCount: existing.installsCount,
      downloadsCount: existing.downloadsCount,
      isArchived: existing.isArchived,
      installCommand: `npx skills add ${validated.owner}/${validated.slug}`,
      message: `Skill '${validated.owner}/${validated.slug}' instalada correctamente.`,
    };
  }

  const skill = await prisma.skill.findFirst({
    where: {
      id: updated.id,
    },
    include: {
      owner: { select: { username: true } },
      versions: { orderBy: { publishedAt: 'desc' } },
    },
  });

  const latestVersion = skill?.versions[0]?.version || '1.0.0';

  return {
    success: true,
    skill: `${validated.owner}/${validated.slug}`,
    name: skill?.name,
    version: latestVersion,
    installsCount: updated.installsCount,
    downloadsCount: updated.downloadsCount,
    isArchived: skill?.isArchived ?? false,
    installCommand: `npx skills add ${validated.owner}/${validated.slug}`,
    message: `Skill '${validated.owner}/${validated.slug}' instalada correctamente.`,
  };
}

/**
 * 15. list_groups: Lists skill groups belonging to authenticated user with name and skillsCount.
 * Returns empty array if unauthenticated or token is invalid.
 */
export async function handleListGroups(
  input: z.input<typeof listGroupsInputSchema> = {},
  bearerToken?: string | null
) {
  const validated = listGroupsInputSchema.parse(input);
  const rawToken = validated.token || bearerToken;

  if (!rawToken) {
    return [];
  }

  const authResult = await validateAccessToken(rawToken, 'read');
  if (!authResult.valid) {
    return [];
  }

  const ownerId = authResult.user.id;
  const groups = await getUserGroups(ownerId);

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    skillsCount: g._count.items,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));
}

/**
 * 16. get_group: Retrieves a skill group by name or ID for authenticated user,
 * returning full list of its skills (including files), applying visibility/ownership criteria per skill.
 */
export async function handleGetGroup(
  input: z.input<typeof getGroupInputSchema>,
  bearerToken?: string | null
) {
  const validated = getGroupInputSchema.parse(input);
  const rawToken = validated.token || bearerToken;

  if (!rawToken) {
    throw new Error('Token de acceso requerido con scope read para consultar grupos.');
  }

  const authResult = await validateAccessToken(rawToken, 'read');
  if (!authResult.valid) {
    throw new Error(`Autenticación fallida: ${authResult.message}`);
  }

  const ownerId = authResult.user.id;
  const groupIdentifier = validated.id || validated.groupId;

  const group = await prisma.skillGroup.findFirst({
    where: {
      ownerId,
      ...(groupIdentifier ? { id: groupIdentifier } : { name: validated.name }),
    },
    include: {
      items: {
        include: {
          skill: {
            include: {
              owner: { select: { username: true, avatarUrl: true } },
              versions: { orderBy: { publishedAt: 'desc' } },
            },
          },
        },
        orderBy: { addedAt: 'asc' },
      },
    },
  });

  if (!group) {
    throw new Error(`Grupo '${validated.name || groupIdentifier}' no encontrado.`);
  }

  const visibleSkills = group.items
    .filter((item) => {
      const skill = item.skill;
      if (!skill) return false;
      return (skill.isPublic && !skill.isPaused) || skill.ownerId === ownerId;
    })
    .map((item) => {
      const skill = item.skill;
      const sortedVersions = [...skill.versions].sort((a, b) => {
        const list = sortVersionsDesc([a.version, b.version]);
        return list[0] === a.version ? -1 : 1;
      });
      const latestVersion = sortedVersions[0] || null;

      return {
        id: skill.id,
        slug: skill.slug,
        name: skill.name,
        description: skill.description,
        license: skill.license,
        repositoryUrl: skill.repositoryUrl,
        owner: skill.owner.username,
        isArchived: skill.isArchived,
        isPublic: skill.isPublic,
        isPaused: skill.isPaused,
        installCommand: `npx skills add ${skill.owner.username}/${skill.slug}`,
        downloadsCount: skill.downloadsCount,
        installsCount: skill.installsCount,
        latestVersion: latestVersion
          ? {
              version: latestVersion.version,
              changelog: latestVersion.changelog,
              gitTag: latestVersion.gitTag,
              files: latestVersion.files ?? null,
              publishedAt: latestVersion.publishedAt,
            }
          : null,
        versions: sortedVersions.map((v) => ({
          version: v.version,
          changelog: v.changelog,
          gitTag: v.gitTag,
          files: v.files ?? null,
          publishedAt: v.publishedAt,
        })),
      };
    });

  return {
    id: group.id,
    name: group.name,
    ownerId: group.ownerId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    skillsCount: visibleSkills.length,
    skills: visibleSkills,
  };
}

