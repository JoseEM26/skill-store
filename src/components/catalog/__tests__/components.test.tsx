import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillCard } from '../SkillCard';
import { ContextCard } from '../ContextCard';
import { EmptyState } from '../EmptyState';
import { InstallSnippet } from '../InstallSnippet';
import { VersionHistory } from '../VersionHistory';
import { SkillDetail } from '../SkillDetail';
import { CatalogSkillItem, CatalogContextItem, SkillDetailResult } from '@/lib/catalog/queries';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

describe('Catalog Components', () => {
  const mockSkillItem: CatalogSkillItem = {
    kind: 'skill',
    id: 'skill-1',
    slug: 'my-test-skill',
    name: 'My Test Skill',
    description: 'Awesome skill description',
    license: 'MIT',
    repositoryUrl: 'https://github.com/Aybar-Corp/my-test-skill',
    downloadsCount: 42,
    installsCount: 15,
    owner: {
      username: 'aybar_dev',
      avatarUrl: null,
    },
    latestVersion: {
      version: '1.2.3',
      publishedAt: new Date('2026-09-30T12:00:00Z'),
      changelog: 'Added shiny features',
      gitTag: 'my-test-skill-v1.2.3',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContextItem: CatalogContextItem = {
    kind: 'context',
    id: 'ctx-1',
    type: 'idea',
    title: 'Public Knowledge Graph Idea',
    body: 'Graph representation for reasoning agents.',
    link: null,
    tags: ['ai', 'knowledge-graph'],
    owner: {
      username: 'aybar_dev',
      avatarUrl: null,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('renders SkillCard with name, version, author, and metrics', () => {
    render(<SkillCard skill={mockSkillItem} />);
    expect(screen.getByText('My Test Skill')).toBeDefined();
    expect(screen.getByText('v1.2.3')).toBeDefined();
    expect(screen.getByText('@aybar_dev')).toBeDefined();
    expect(screen.getByText('Awesome skill description')).toBeDefined();
    expect(screen.getByText(/42 descargas/)).toBeDefined();
    expect(screen.getByText(/15 installs/)).toBeDefined();
  });

  it('renders ContextCard with title, tags, and type badge', () => {
    render(<ContextCard context={mockContextItem} />);
    expect(screen.getByText('Public Knowledge Graph Idea')).toBeDefined();
    expect(screen.getByText('Idea Pública')).toBeDefined();
    expect(screen.getByText('#ai')).toBeDefined();
    expect(screen.getByText('#knowledge-graph')).toBeDefined();
  });

  it('renders EmptyState with explicit message', () => {
    render(
      <EmptyState
        title="Sin skills disponibles"
        description="Prueba con otro término"
      />
    );
    expect(screen.getByText('Sin skills disponibles')).toBeDefined();
    expect(screen.getByText('Prueba con otro término')).toBeDefined();
  });

  it('renders InstallSnippet with copyable command', async () => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<InstallSnippet owner="Aybar-Corp" slug="architecture-planner" />);
    expect(screen.getByText('npx skills add Aybar-Corp/architecture-planner')).toBeDefined();

    const copyBtn = screen.getByTestId('copy-install-btn');
    await React.act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'npx skills add Aybar-Corp/architecture-planner'
    );
  });

  it('renders VersionHistory list with tags and changelogs', () => {
    const versions = [
      {
        id: 'v2',
        version: '1.2.0',
        changelog: 'Added search and filter capability',
        gitTag: 'my-skill-v1.2.0',
        publishedAt: new Date('2026-09-30T10:00:00Z'),
      },
      {
        id: 'v1',
        version: '1.0.0',
        changelog: 'Initial release',
        gitTag: 'my-skill-v1.0.0',
        publishedAt: new Date('2026-09-20T10:00:00Z'),
      },
    ];

    render(<VersionHistory versions={versions} />);
    expect(screen.getByText('v1.2.0')).toBeDefined();
    expect(screen.getByText('v1.0.0')).toBeDefined();
    expect(screen.getByText('Última')).toBeDefined();
    expect(screen.getByText('Added search and filter capability')).toBeDefined();
    expect(screen.getByText('Initial release')).toBeDefined();
  });

  it('renders full SkillDetail view', () => {
    const mockDetail: SkillDetailResult = {
      ...mockSkillItem,
      latestVersion: {
        id: 'v1',
        version: '1.2.3',
        changelog: 'Added shiny features',
        gitTag: 'my-test-skill-v1.2.3',
        publishedAt: new Date(),
      },
      versions: [
        {
          id: 'v1',
          version: '1.2.3',
          changelog: 'Added shiny features',
          gitTag: 'my-test-skill-v1.2.3',
          publishedAt: new Date(),
        },
      ],
      owner: {
        id: 'user-1',
        username: 'aybar_dev',
        avatarUrl: null,
      },
    };

    render(<SkillDetail skill={mockDetail} />);
    expect(screen.getByTestId('skill-detail-view')).toBeDefined();
    expect(screen.getByText('My Test Skill')).toBeDefined();
    expect(screen.getByText('npx skills add aybar_dev/my-test-skill')).toBeDefined();
    expect(screen.getByTestId('github-repo-link')).toBeDefined();
    expect(screen.getByTestId('download-skill-btn')).toBeDefined();
    expect(screen.getByTestId('skill-downloads-count').textContent).toBe('42');
    expect(screen.getByTestId('skill-installs-count').textContent).toBe('15');
  });

  it('renders "Archivado" badge on SkillDetail, SkillCard, and ContextCard when isArchived is true', () => {
    const archivedSkillItem: CatalogSkillItem = {
      ...mockSkillItem,
      isArchived: true,
    };
    const { unmount: unmountCard } = render(<SkillCard skill={archivedSkillItem} />);
    expect(screen.getByTestId('archived-badge').textContent).toBe('Archivado');
    unmountCard();

    const archivedContextItem: CatalogContextItem = {
      ...mockContextItem,
      isArchived: true,
    };
    const { unmount: unmountCtx } = render(<ContextCard context={archivedContextItem} />);
    expect(screen.getByTestId('archived-badge').textContent).toBe('Archivado');
    unmountCtx();

    const archivedDetail: SkillDetailResult = {
      ...mockSkillItem,
      isArchived: true,
      latestVersion: {
        id: 'v1',
        version: '1.2.3',
        changelog: 'Added shiny features',
        gitTag: 'my-test-skill-v1.2.3',
        publishedAt: new Date(),
      },
      versions: [],
      owner: {
        id: 'user-1',
        username: 'aybar_dev',
        avatarUrl: null,
      },
    };
    render(<SkillDetail skill={archivedDetail} />);
    expect(screen.getByTestId('archived-badge').textContent).toBe('Archivado');
  });
});
