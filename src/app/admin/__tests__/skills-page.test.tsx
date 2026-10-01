import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkillList } from '@/components/admin/SkillList';
import { SkillForm } from '@/components/admin/SkillForm';
import type { SkillWithVersions } from '@/lib/admin/skills';
import * as actions from '@/app/admin/actions';

vi.mock('@/app/admin/actions', () => ({
  createSkillAction: vi.fn(),
  updateSkillAction: vi.fn(),
  deleteSkillAction: vi.fn(),
}));

describe('Skills Admin UI Components', () => {
  const mockSkills: SkillWithVersions[] = [
    {
      id: 'skill-1',
      slug: 'awesome-agent',
      name: 'Awesome Agent',
      description: 'An awesome AI assistant skill',
      license: 'MIT',
      repositoryUrl: 'https://github.com/aybardev/awesome-agent',
      downloadsCount: 120,
      installsCount: 45,
      isArchived: false,
      ownerId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      versions: [
        {
          id: 'v-1',
          skillId: 'skill-1',
          version: '1.0.0',
          changelog: 'Initial release',
          gitTag: 'v1.0.0',
          publishedAt: new Date(),
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SkillList with skills, versions, and metrics', () => {
    render(<SkillList initialSkills={mockSkills} username="aybardev" />);

    expect(screen.getByText('Awesome Agent')).toBeDefined();
    expect(screen.getByText('(aybardev/awesome-agent)')).toBeDefined();
    expect(screen.getByText('v1.0.0')).toBeDefined();
    expect(screen.getByText(/120 descargas/)).toBeDefined();
    expect(screen.getByText(/45 instalaciones/)).toBeDefined();
  });

  it('toggles Create Skill Form when clicking + Registrar Nueva Skill', () => {
    render(<SkillList initialSkills={mockSkills} username="aybardev" />);

    expect(screen.queryByText('Registrar Nueva Skill')).toBeNull();

    fireEvent.click(screen.getByText('+ Registrar Nueva Skill'));
    expect(screen.getByText('Registrar Nueva Skill')).toBeDefined();
  });

  it('submits SkillForm successfully calling createSkillAction', async () => {
    vi.mocked(actions.createSkillAction).mockResolvedValue({
      success: true,
      data: {
        id: 'new-skill-id',
        slug: 'super-tool',
        name: 'Super Tool',
        description: 'A super useful tool',
        license: 'Apache-2.0',
        repositoryUrl: 'https://github.com/aybardev/super-tool',
        downloadsCount: 0,
        installsCount: 0,
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const handleSuccess = vi.fn();
    render(<SkillForm onSuccess={handleSuccess} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Slug/), {
      target: { value: 'super-tool' },
    });
    fireEvent.change(screen.getByLabelText(/Nombre de la Skill/), {
      target: { value: 'Super Tool' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/), {
      target: { value: 'A super useful tool' },
    });
    fireEvent.change(screen.getByLabelText(/Licencia/), {
      target: { value: 'Apache-2.0' },
    });
    fireEvent.change(screen.getByLabelText(/URL del Repositorio/), {
      target: { value: 'https://github.com/aybardev/super-tool' },
    });

    fireEvent.click(screen.getByText('Registrar Skill'));

    await waitFor(() => {
      expect(actions.createSkillAction).toHaveBeenCalledWith({
        slug: 'super-tool',
        name: 'Super Tool',
        description: 'A super useful tool',
        license: 'Apache-2.0',
        repositoryUrl: 'https://github.com/aybardev/super-tool',
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('handles server error when submitting SkillForm', async () => {
    vi.mocked(actions.createSkillAction).mockResolvedValue({
      success: false,
      error: 'Ya posees una skill registrada con el slug "super-tool".',
    });

    render(<SkillForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Slug/), {
      target: { value: 'super-tool' },
    });
    fireEvent.change(screen.getByLabelText(/Nombre de la Skill/), {
      target: { value: 'Super Tool' },
    });

    fireEvent.click(screen.getByText('Registrar Skill'));

    await waitFor(() => {
      expect(
        screen.getByText('Ya posees una skill registrada con el slug "super-tool".')
      ).toBeDefined();
    });
  });

  it('calls deleteSkillAction on skill deletion after confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(actions.deleteSkillAction).mockResolvedValue({ success: true });

    render(<SkillList initialSkills={mockSkills} username="aybardev" />);

    const deleteButtons = screen.getAllByText('Eliminar');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(actions.deleteSkillAction).toHaveBeenCalledWith('skill-1');
    });
  });
});
