import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CatalogPage from '../page';
import SkillDetailPage from '../skills/[owner]/[slug]/page';
import ContextDetailPage from '../contexts/[id]/page';
import * as catalogQueries from '@/lib/catalog/queries';

// Mock next/navigation
const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  },
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

describe('Catalog Routes and Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CatalogPage (src/app/page.tsx)', () => {
    it('renders list of skills and contexts returned from queries', async () => {
      vi.spyOn(catalogQueries, 'getPublicCatalog').mockResolvedValueOnce({
        items: [
          {
            kind: 'skill',
            id: 'skill-1',
            slug: 'mock-skill',
            name: 'Mock Skill One',
            description: 'Description for mock skill',
            license: 'MIT',
            repositoryUrl: null,
            downloadsCount: 10,
            installsCount: 5,
            owner: { username: 'testuser', avatarUrl: null },
            latestVersion: {
              version: '1.0.0',
              publishedAt: new Date(),
              changelog: null,
              gitTag: null,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        skillsCount: 1,
        contextsCount: 0,
      });

      const page = await CatalogPage({
        searchParams: Promise.resolve({ q: '', type: 'all' }),
      });

      render(page);
      expect(screen.getByText('Mock Skill One')).toBeDefined();
      expect(screen.getByText('Catálogo Público de Skills y Contextos')).toBeDefined();
    });

    it('renders EmptyState when zero items returned', async () => {
      vi.spyOn(catalogQueries, 'getPublicCatalog').mockResolvedValueOnce({
        items: [],
        total: 0,
        skillsCount: 0,
        contextsCount: 0,
      });

      const page = await CatalogPage({
        searchParams: Promise.resolve({ q: 'nonexistent', type: 'all' }),
      });

      render(page);
      expect(screen.getByText('No se encontraron recursos')).toBeDefined();
    });
  });

  describe('SkillDetailPage (src/app/skills/[owner]/[slug]/page.tsx)', () => {
    it('renders skill detail when skill exists', async () => {
      vi.spyOn(catalogQueries, 'getSkillByOwnerAndSlug').mockResolvedValueOnce({
        id: 'skill-1',
        slug: 'mock-slug',
        name: 'Mock Skill Detail',
        description: 'Detailed description',
        license: 'Apache-2.0',
        repositoryUrl: 'https://github.com/testuser/mock-slug',
        downloadsCount: 100,
        installsCount: 50,
        owner: { id: 'u1', username: 'testuser', avatarUrl: null },
        latestVersion: {
          id: 'v1',
          version: '1.0.0',
          changelog: 'First release',
          gitTag: 'mock-slug-v1.0.0',
          publishedAt: new Date(),
        },
        versions: [
          {
            id: 'v1',
            version: '1.0.0',
            changelog: 'First release',
            gitTag: 'mock-slug-v1.0.0',
            publishedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const page = await SkillDetailPage({
        params: Promise.resolve({ owner: 'testuser', slug: 'mock-slug' }),
      });

      render(page);
      expect(screen.getByText('Mock Skill Detail')).toBeDefined();
      expect(screen.getByText('npx skills add testuser/mock-slug')).toBeDefined();
    });

    it('triggers notFound() when skill is not found', async () => {
      vi.spyOn(catalogQueries, 'getSkillByOwnerAndSlug').mockResolvedValueOnce(null);

      await expect(
        SkillDetailPage({
          params: Promise.resolve({ owner: 'testuser', slug: 'missing-skill' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });
  });

  describe('ContextDetailPage (src/app/contexts/[id]/page.tsx)', () => {
    it('renders public context detail', async () => {
      vi.spyOn(catalogQueries, 'getPublicContextById').mockResolvedValueOnce({
        id: 'ctx-1',
        type: 'external_reference',
        title: 'Super Context Title',
        body: 'Context body content',
        link: 'https://example.com/ref',
        tags: ['ref', 'tool'],
        ownerId: 'u1',
        isPublic: true,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'u1', username: 'testuser', avatarUrl: null },
      });

      const page = await ContextDetailPage({
        params: Promise.resolve({ id: 'ctx-1' }),
      });

      render(page);
      expect(screen.getAllByText('Super Context Title').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('https://example.com/ref ↗')).toBeDefined();
      expect(screen.getByText('#ref')).toBeDefined();
    });

    it('triggers notFound() when context is private or missing', async () => {
      vi.spyOn(catalogQueries, 'getPublicContextById').mockResolvedValueOnce(null);

      await expect(
        ContextDetailPage({
          params: Promise.resolve({ id: 'private-ctx-id' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });
  });
});
