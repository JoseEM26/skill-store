import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GroupList } from '@/components/admin/GroupList';
import AdminGroupsPage from '@/app/admin/groups/page';
import type { GroupWithItemsAndCount } from '@/components/admin/GroupList';
import type { SkillWithVersions } from '@/lib/admin/skills';
import * as actions from '@/app/admin/actions';
import * as navigationModule from 'next/navigation';
import * as groupsLib from '@/lib/admin/groups';
import * as skillsLib from '@/lib/admin/skills';
import * as catalogLib from '@/lib/catalog/queries';
import type { Session } from 'next-auth';

const mockAuth = vi.fn();

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/admin/groups', () => ({
  getUserGroups: vi.fn(),
  getUserGroupById: vi.fn(),
}));

vi.mock('@/lib/admin/skills', () => ({
  getUserSkills: vi.fn(),
}));

vi.mock('@/lib/catalog/queries', () => ({
  getPublicCatalog: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    skillsCount: 0,
    contextsCount: 0,
  }),
}));

vi.mock('@/app/admin/actions', () => ({
  createGroupAction: vi.fn(),
  renameGroupAction: vi.fn(),
  deleteGroupAction: vi.fn(),
  addSkillToGroupAction: vi.fn(),
  removeSkillFromGroupAction: vi.fn(),
}));

describe('Groups Admin UI Components', () => {
  const mockSkills: SkillWithVersions[] = [
    {
      id: 'skill-1',
      slug: 'react-tools',
      name: 'React Tools',
      description: 'Useful react utilities',
      license: 'MIT',
      repositoryUrl: 'https://github.com/user1/react-tools',
      downloadsCount: 10,
      installsCount: 5,
      isArchived: false,
      isPublic: true,
      isPaused: false,
      ownerId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      versions: [],
    },
    {
      id: 'skill-2',
      slug: 'node-tools',
      name: 'Node Tools',
      description: 'Useful node utilities',
      license: 'MIT',
      repositoryUrl: 'https://github.com/user1/node-tools',
      downloadsCount: 20,
      installsCount: 8,
      isArchived: false,
      isPublic: true,
      isPaused: false,
      ownerId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      versions: [],
    },
  ];

  const mockGroups: GroupWithItemsAndCount[] = [
    {
      id: 'group-1',
      name: 'Stack Frontend',
      ownerId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          groupId: 'group-1',
          skillId: 'skill-1',
          addedAt: new Date(),
          skill: mockSkills[0],
        },
      ],
      _count: {
        items: 1,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders GroupList with groups and skills checkboxes', () => {
    render(<GroupList initialGroups={mockGroups} userSkills={mockSkills} />);

    expect(screen.getByText('Grupos de Skills (1)')).toBeDefined();
    expect(screen.getByText('Stack Frontend')).toBeDefined();
    expect(screen.getByText('1 skill')).toBeDefined();

    const checkboxSkill1 = screen.getByTestId('skill-checkbox-group-1-skill-1') as HTMLInputElement;
    const checkboxSkill2 = screen.getByTestId('skill-checkbox-group-1-skill-2') as HTMLInputElement;

    expect(checkboxSkill1.checked).toBe(true);
    expect(checkboxSkill2.checked).toBe(false);
  });

  it('shows empty state when no groups exist', () => {
    render(<GroupList initialGroups={[]} userSkills={mockSkills} />);

    expect(screen.getByText(/No tienes grupos creados todavía/)).toBeDefined();
  });

  it('toggles Create Group form and creates a group successfully', async () => {
    vi.mocked(actions.createGroupAction).mockResolvedValue({
      success: true,
      data: {
        id: 'group-2',
        name: 'Stack Backend',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    render(<GroupList initialGroups={mockGroups} userSkills={mockSkills} />);

    fireEvent.click(screen.getByText('+ Crear Nuevo Grupo'));
    expect(screen.getByRole('form', { name: 'Crear Nuevo Grupo' })).toBeDefined();

    const input = screen.getByLabelText('Nombre del Grupo');
    fireEvent.change(input, { target: { value: 'Stack Backend' } });

    fireEvent.click(screen.getByText('Crear Grupo'));

    await waitFor(() => {
      expect(actions.createGroupAction).toHaveBeenCalledWith('Stack Backend');
      expect(screen.getByText('Stack Backend')).toBeDefined();
      expect(screen.getByText('Grupos de Skills (2)')).toBeDefined();
    });
  });

  it('renames a group successfully', async () => {
    vi.mocked(actions.renameGroupAction).mockResolvedValue({
      success: true,
      data: {
        id: 'group-1',
        name: 'Stack Frontend Pro',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    render(<GroupList initialGroups={mockGroups} userSkills={mockSkills} />);

    fireEvent.click(screen.getByTestId('rename-group-btn-group-1'));

    const input = screen.getByLabelText('Nombre del grupo');
    fireEvent.change(input, { target: { value: 'Stack Frontend Pro' } });

    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(actions.renameGroupAction).toHaveBeenCalledWith('group-1', 'Stack Frontend Pro');
      expect(screen.getByText('Stack Frontend Pro')).toBeDefined();
    });
  });

  it('deletes a group with confirmation modal', async () => {
    vi.mocked(actions.deleteGroupAction).mockResolvedValue({
      success: true,
    });

    render(<GroupList initialGroups={mockGroups} userSkills={mockSkills} />);

    fireEvent.click(screen.getByTestId('delete-group-btn-group-1'));

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/Confirmar eliminación de grupo/)).toBeDefined();

    fireEvent.click(screen.getByTestId('confirm-delete-group-btn'));

    await waitFor(() => {
      expect(actions.deleteGroupAction).toHaveBeenCalledWith('group-1');
      expect(screen.queryByText('Stack Frontend')).toBeNull();
      expect(screen.getByText(/No tienes grupos creados todavía/)).toBeDefined();
    });
  });

  it('adds a skill to a group and marks checkbox as included', async () => {
    vi.mocked(actions.addSkillToGroupAction).mockResolvedValue({
      success: true,
      data: {
        groupId: 'group-1',
        skillId: 'skill-2',
        addedAt: new Date(),
      },
    });

    render(<GroupList initialGroups={mockGroups} userSkills={mockSkills} />);

    const checkboxSkill2 = screen.getByTestId('skill-checkbox-group-1-skill-2') as HTMLInputElement;
    expect(checkboxSkill2.checked).toBe(false);

    fireEvent.click(checkboxSkill2);

    await waitFor(() => {
      expect(actions.addSkillToGroupAction).toHaveBeenCalledWith('group-1', 'skill-2');
      expect(checkboxSkill2.checked).toBe(true);
      expect(screen.getByText('2 skills')).toBeDefined();
    });
  });

  it('removes a skill from a group and unchecks checkbox', async () => {
    vi.mocked(actions.removeSkillFromGroupAction).mockResolvedValue({
      success: true,
    });

    render(<GroupList initialGroups={mockGroups} userSkills={mockSkills} />);

    const checkboxSkill1 = screen.getByTestId('skill-checkbox-group-1-skill-1') as HTMLInputElement;
    expect(checkboxSkill1.checked).toBe(true);

    fireEvent.click(checkboxSkill1);

    await waitFor(() => {
      expect(actions.removeSkillFromGroupAction).toHaveBeenCalledWith('group-1', 'skill-1');
      expect(checkboxSkill1.checked).toBe(false);
      expect(screen.getByText('0 skills')).toBeDefined();
    });
  });

  it('displays error message visually when adding a skill fails (e.g. skill ajena)', async () => {
    vi.mocked(actions.addSkillToGroupAction).mockResolvedValue({
      success: false,
      error: 'Recurso no encontrado o no pertenece a tu usuario',
    });

    render(<GroupList initialGroups={mockGroups} userSkills={mockSkills} />);

    const checkboxSkill2 = screen.getByTestId('skill-checkbox-group-1-skill-2');
    fireEvent.click(checkboxSkill2);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(
        screen.getByText('Recurso no encontrado o no pertenece a tu usuario')
      ).toBeDefined();
    });
  });

  it('shows visual indicators distinguishing own skills from public skills of other owners', () => {
    const publicSkill = {
      kind: 'skill' as const,
      id: 'skill-public-1',
      slug: 'community-helper',
      name: 'Community Helper',
      description: 'Shared tool',
      license: 'MIT',
      repositoryUrl: null,
      downloadsCount: 50,
      installsCount: 20,
      owner: {
        username: 'Aybar-Corp',
        avatarUrl: null,
      },
      latestVersion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<GroupList initialGroups={mockGroups} userSkills={[...mockSkills, publicSkill]} />);

    expect(screen.getByTestId('skill-badge-own-skill-1').textContent).toBe('propia');
    expect(screen.getByTestId('skill-badge-public-skill-public-1').textContent).toBe('@Aybar-Corp');
    expect(screen.getByText('Aybar-Corp/community-helper')).toBeDefined();
    expect(screen.getByText('react-tools')).toBeDefined();
  });
});

describe('AdminGroupsPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to signin if session is missing', async () => {
    mockAuth.mockResolvedValue(null);

    await AdminGroupsPage();

    expect(navigationModule.redirect).toHaveBeenCalledWith(
      '/api/auth/signin?callbackUrl=/admin/groups'
    );
  });

  it('fetches groups and skills and renders page when user is authenticated', async () => {
    const mockSession: Session = {
      user: {
        id: 'usr_test_123',
        name: 'Test User',
      },
      expires: new Date().toISOString(),
    };
    mockAuth.mockResolvedValue(mockSession);

    vi.mocked(groupsLib.getUserGroups).mockResolvedValue([
      {
        id: 'grp-1',
        name: 'My Custom Group',
        ownerId: 'usr_test_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { items: 0 },
      },
    ]);

    vi.mocked(groupsLib.getUserGroupById).mockResolvedValue({
      id: 'grp-1',
      name: 'My Custom Group',
      ownerId: 'usr_test_123',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
      _count: { items: 0 },
    });

    vi.mocked(skillsLib.getUserSkills).mockResolvedValue([]);

    const jsx = await AdminGroupsPage();
    if (jsx) {
      render(jsx);
    }

    expect(screen.getByText('Mis Grupos de Skills')).toBeDefined();
    expect(screen.getByText('My Custom Group')).toBeDefined();
    expect(screen.getByText('← Volver al Panel')).toBeDefined();
  });

  it('fetches getPublicCatalog and deduplicates skills prioritizing getUserSkills', async () => {
    const mockSession: Session = {
      user: {
        id: 'usr_test_123',
        name: 'Test User',
      },
      expires: new Date().toISOString(),
    };
    mockAuth.mockResolvedValue(mockSession);

    vi.mocked(groupsLib.getUserGroups).mockResolvedValue([
      {
        id: 'grp-1',
        name: 'Test Group',
        ownerId: 'usr_test_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { items: 0 },
      },
    ]);
    vi.mocked(groupsLib.getUserGroupById).mockResolvedValue({
      id: 'grp-1',
      name: 'Test Group',
      ownerId: 'usr_test_123',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
      _count: { items: 0 },
    });

    const ownSkill = {
      id: 'skill-own-1',
      slug: 'own-skill',
      name: 'Own Skill Name',
      description: 'Own description',
      license: 'MIT',
      repositoryUrl: null,
      downloadsCount: 1,
      installsCount: 1,
      isArchived: false,
      isPublic: true,
      isPaused: false,
      ownerId: 'usr_test_123',
      createdAt: new Date(),
      updatedAt: new Date(),
      versions: [],
    };
    vi.mocked(skillsLib.getUserSkills).mockResolvedValue([ownSkill]);

    vi.mocked(catalogLib.getPublicCatalog).mockResolvedValue({
      items: [
        {
          kind: 'skill',
          id: 'skill-own-1',
          slug: 'own-skill-duplicate',
          name: 'Public Version of Own Skill',
          description: null,
          license: 'MIT',
          repositoryUrl: null,
          downloadsCount: 1,
          installsCount: 1,
          owner: { username: 'testuser', avatarUrl: null },
          latestVersion: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          kind: 'skill',
          id: 'skill-ext-2',
          slug: 'ext-skill',
          name: 'External Skill',
          description: null,
          license: 'MIT',
          repositoryUrl: null,
          downloadsCount: 5,
          installsCount: 2,
          owner: { username: 'Aybar-Corp', avatarUrl: null },
          latestVersion: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 2,
      skillsCount: 2,
      contextsCount: 0,
    });

    const jsx = await AdminGroupsPage();
    expect(catalogLib.getPublicCatalog).toHaveBeenCalledWith({ type: 'skills' });
    if (jsx) {
      render(jsx);
    }

    expect(screen.getByText('Own Skill Name')).toBeDefined();
    expect(screen.getByText('External Skill')).toBeDefined();
    expect(screen.queryByText('Public Version of Own Skill')).toBeNull();
  });
});
