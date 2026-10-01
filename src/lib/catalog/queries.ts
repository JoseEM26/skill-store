import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { sortVersionsDesc } from '../skills/semver';

export type CatalogItemFilter = 'all' | 'skills' | 'contexts' | 'ideas' | 'external_references';

export interface CatalogQueryParams {
  q?: string;
  type?: string;
}

export interface CatalogSkillItem {
  kind: 'skill';
  id: string;
  slug: string;
  name: string;
  description: string | null;
  license: string | null;
  repositoryUrl: string | null;
  downloadsCount: number;
  installsCount: number;
  owner: {
    username: string;
    avatarUrl: string | null;
  };
  latestVersion: {
    id?: string;
    version: string;
    publishedAt: Date;
    changelog: string | null;
    gitTag: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CatalogContextItem {
  kind: 'context';
  id: string;
  type: string; // 'idea' | 'external_reference'
  title: string;
  body: string | null;
  link: string | null;
  tags: string[];
  owner: {
    username: string;
    avatarUrl: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type CatalogItem = CatalogSkillItem | CatalogContextItem;

export interface SkillDetailResult {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  license: string | null;
  repositoryUrl: string | null;
  downloadsCount: number;
  installsCount: number;
  owner: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  latestVersion: {
    id?: string;
    version: string;
    changelog: string | null;
    gitTag: string | null;
    publishedAt: Date;
  } | null;
  versions: Array<{
    id: string;
    version: string;
    changelog: string | null;
    gitTag: string | null;
    publishedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Retrieves public catalog items (skills and public contexts) with search and type filters.
 * STRICT: Excludes all private contexts (isPublic = false) and archived items (isArchived = true).
 */
export async function getPublicCatalog(params?: CatalogQueryParams): Promise<{
  items: CatalogItem[];
  total: number;
  skillsCount: number;
  contextsCount: number;
}> {
  const query = params?.q?.trim();
  const typeFilter = params?.type?.trim() || 'all';

  const shouldFetchSkills = typeFilter === 'all' || typeFilter === 'skills';
  const shouldFetchContexts =
    typeFilter === 'all' ||
    typeFilter === 'contexts' ||
    typeFilter === 'ideas' ||
    typeFilter === 'external_references';

  const items: CatalogItem[] = [];
  let skillsCount = 0;
  let contextsCount = 0;

  // 1. Fetch Skills (if requested)
  if (shouldFetchSkills) {
    const skillWhere: Prisma.SkillWhereInput = {
      isArchived: false,
    };

    if (query) {
      skillWhere.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    const skills = await prisma.skill.findMany({
      where: skillWhere,
      include: {
        owner: { select: { username: true, avatarUrl: true } },
        versions: { orderBy: { publishedAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    skillsCount = skills.length;

    for (const s of skills) {
      let latestVersion = null;
      if (s.versions.length > 0) {
        const sortedVersionStrings = sortVersionsDesc(s.versions.map((v) => v.version));
        const maxVer = sortedVersionStrings[0];
        const verObj = s.versions.find((v) => v.version === maxVer) || s.versions[0];
        latestVersion = {
          id: verObj.id,
          version: verObj.version,
          publishedAt: verObj.publishedAt,
          changelog: verObj.changelog,
          gitTag: verObj.gitTag,
        };
      }

      items.push({
        kind: 'skill',
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        license: s.license,
        repositoryUrl: s.repositoryUrl,
        downloadsCount: s.downloadsCount,
        installsCount: s.installsCount,
        owner: s.owner,
        latestVersion,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      });
    }
  }

  // 2. Fetch Public Contexts (if requested)
  if (shouldFetchContexts) {
    const contextWhere: Prisma.ContextWhereInput = {
      isPublic: true,
      isArchived: false,
    };

    if (typeFilter === 'ideas') {
      contextWhere.type = 'idea';
    } else if (typeFilter === 'external_references') {
      contextWhere.type = 'external_reference';
    }

    if (query) {
      contextWhere.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ];
    }

    const contexts = await prisma.context.findMany({
      where: contextWhere,
      include: {
        owner: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    contextsCount = contexts.length;

    for (const c of contexts) {
      items.push({
        kind: 'context',
        id: c.id,
        type: c.type,
        title: c.title,
        body: c.body,
        link: c.link,
        tags: c.tags,
        owner: c.owner,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      });
    }
  }

  // Sort unified list by updatedAt descending
  items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return {
    items,
    total: items.length,
    skillsCount,
    contextsCount,
  };
}

/**
 * Retrieves a skill by owner username and skill slug.
 * Returns null if the skill does not exist or is archived.
 */
export async function getSkillByOwnerAndSlug(
  ownerUsername: string,
  slug: string
): Promise<SkillDetailResult | null> {
  const skill = await prisma.skill.findFirst({
    where: {
      slug,
      isArchived: false,
      owner: {
        username: ownerUsername,
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      versions: {
        orderBy: {
          publishedAt: 'desc',
        },
      },
    },
  });

  if (!skill) return null;

  // Sort versions by SemVer descending for consistent display
  const sortedVersions = [...skill.versions].sort((a, b) => {
    const list = sortVersionsDesc([a.version, b.version]);
    return list[0] === a.version ? -1 : 1;
  });

  const latestVersion = sortedVersions.length > 0 ? sortedVersions[0] : null;

  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    license: skill.license,
    repositoryUrl: skill.repositoryUrl,
    downloadsCount: skill.downloadsCount,
    installsCount: skill.installsCount,
    owner: skill.owner,
    latestVersion,
    versions: sortedVersions,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  };
}

/**
 * Retrieves a public context by ID.
 * Returns null if the context does not exist, is private (isPublic = false) or is archived (isArchived = true).
 */
export async function getPublicContextById(id: string) {
  const context = await prisma.context.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!context || !context.isPublic || context.isArchived) {
    return null;
  }

  return context;
}
