import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkillList } from '@/components/admin/SkillList';
import { SkillForm } from '@/components/admin/SkillForm';
import type { SkillWithVersions } from '@/lib/admin/skills';
import * as actions from '@/app/admin/actions';

vi.mock('@/app/admin/actions', () => ({
  createSkillAction: vi.fn(),
  createSkillContentAction: vi.fn(),
  updateSkillAction: vi.fn(),
  updateSkillContentAction: vi.fn(),
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
      isPublic: true,
      isPaused: false,
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
          files: null,
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

  it('submits SkillForm successfully calling createSkillAction via metadata tab', async () => {
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

    fireEvent.click(screen.getByTestId('tab-metadata'));

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
        isPublic: true,
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('handles server error when submitting SkillForm in metadata mode', async () => {
    vi.mocked(actions.createSkillAction).mockResolvedValue({
      success: false,
      error: 'Ya posees una skill registrada con el slug "super-tool".',
    });

    render(<SkillForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByTestId('tab-metadata'));

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

  it('defaults to content mode when creating and creates skill via createSkillContentAction', async () => {
    vi.mocked(actions.createSkillContentAction).mockResolvedValue({
      success: true,
      data: mockSkills[0],
    });

    const handleSuccess = vi.fn();
    render(<SkillForm onSuccess={handleSuccess} onCancel={vi.fn()} />);

    // Content textarea is present by default without clicking any tab
    const textarea = screen.getByTestId('skill-content-textarea');
    expect(textarea).toBeDefined();

    const sampleContent = `---
name: awesome-agent
description: An awesome AI assistant skill
license: MIT
compatibility: "Claude Code, OpenAI Codex, Cursor >= 0.40"
metadata:
  version: "1.0.0"
  author: "aybardev"
---

## 1. Propósito y Cuándo Usar
Propósito.

## 2. Flujo de Trabajo (Workflow)
Workflow.

## 3. Reglas y Restricciones (Criterios de Diseño)
Reglas.

## 4. Árbol de Decisión (Si aplica)
Árbol.

## 5. Ejemplos Ejecutables
Ejemplos.

## 6. Manejo de Errores y Casos Excepcionales
Manejo de errores.
`;

    fireEvent.change(textarea, { target: { value: sampleContent } });
    fireEvent.click(screen.getByTestId('save-content-btn'));

    await waitFor(() => {
      expect(actions.createSkillContentAction).toHaveBeenCalledWith({
        content: sampleContent,
        isPublic: true,
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('creates private skill via createSkillContentAction when unchecking visibility checkbox in SkillForm', async () => {
    vi.mocked(actions.createSkillContentAction).mockResolvedValue({
      success: true,
      data: { ...mockSkills[0], isPublic: false },
    });

    const handleSuccess = vi.fn();
    render(<SkillForm onSuccess={handleSuccess} onCancel={vi.fn()} />);

    const textarea = screen.getByTestId('skill-content-textarea');
    const checkbox = screen.getByTestId('skill-content-isPublic-checkbox') as HTMLInputElement;

    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    const sampleContent = `---
name: private-agent
description: A private skill
license: MIT
compatibility: "Claude Code"
metadata:
  version: "1.0.0"
  author: "aybardev"
---

## 1. Propósito y Cuándo Usar
Propósito.

## 2. Flujo de Trabajo (Workflow)
Workflow.

## 3. Reglas y Restricciones (Criterios de Diseño)
Reglas.

## 4. Árbol de Decisión (Si aplica)
Árbol.

## 5. Ejemplos Ejecutables
Ejemplos.

## 6. Manejo de Errores y Casos Excepcionales
Manejo de errores.
`;

    fireEvent.change(textarea, { target: { value: sampleContent } });
    fireEvent.click(screen.getByTestId('save-content-btn'));

    await waitFor(() => {
      expect(actions.createSkillContentAction).toHaveBeenCalledWith({
        content: sampleContent,
        isPublic: false,
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('shows specific validation error when creating skill with invalid content in SkillForm', async () => {
    vi.mocked(actions.createSkillContentAction).mockResolvedValue({
      success: false,
      error: 'Frontmatter inválido: metadata: El campo "metadata" es obligatorio',
    });

    render(<SkillForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    const textarea = screen.getByTestId('skill-content-textarea');
    fireEvent.change(textarea, { target: { value: 'invalid content' } });
    fireEvent.click(screen.getByTestId('save-content-btn'));

    await waitFor(() => {
      const errorDiv = screen.getByTestId('form-error');
      expect(errorDiv.textContent).toContain('Frontmatter inválido');
    });
  });

  it('toggles visibility from public to private', async () => {
    vi.mocked(actions.updateSkillAction).mockResolvedValue({ success: true });

    render(<SkillList initialSkills={mockSkills} username="aybardev" />);

    expect(screen.getByTestId('visibility-badge').textContent).toBe('Pública');
    const toggleBtn = screen.getByTestId('toggle-visibility-skill-1');
    expect(toggleBtn.textContent).toBe('Hacer privada');

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(actions.updateSkillAction).toHaveBeenCalledWith({
        id: 'skill-1',
        isPublic: false,
      });
    });
  });

  it('toggles visibility from private to public', async () => {
    vi.mocked(actions.updateSkillAction).mockResolvedValue({ success: true });

    const privateSkills: SkillWithVersions[] = [
      {
        ...mockSkills[0],
        isPublic: false,
      },
    ];

    render(<SkillList initialSkills={privateSkills} username="aybardev" />);

    expect(screen.getByTestId('visibility-badge').textContent).toBe('Privada');
    const toggleBtn = screen.getByTestId('toggle-visibility-skill-1');
    expect(toggleBtn.textContent).toBe('Hacer pública');

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(actions.updateSkillAction).toHaveBeenCalledWith({
        id: 'skill-1',
        isPublic: true,
      });
    });
  });

  it('toggles paused state from unpaused to paused', async () => {
    vi.mocked(actions.updateSkillAction).mockResolvedValue({ success: true });

    render(<SkillList initialSkills={mockSkills} username="aybardev" />);

    expect(screen.queryByTestId('paused-badge')).toBeNull();
    const toggleBtn = screen.getByTestId('toggle-paused-skill-1');
    expect(toggleBtn.textContent).toBe('Pausar');

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(actions.updateSkillAction).toHaveBeenCalledWith({
        id: 'skill-1',
        isPaused: true,
      });
    });
  });

  it('toggles paused state from paused to unpaused', async () => {
    vi.mocked(actions.updateSkillAction).mockResolvedValue({ success: true });

    const pausedSkills: SkillWithVersions[] = [
      {
        ...mockSkills[0],
        isPaused: true,
      },
    ];

    render(<SkillList initialSkills={pausedSkills} username="aybardev" />);

    expect(screen.getByTestId('paused-badge').textContent).toBe('Pausada');
    const toggleBtn = screen.getByTestId('toggle-paused-skill-1');
    expect(toggleBtn.textContent).toBe('Reanudar');

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(actions.updateSkillAction).toHaveBeenCalledWith({
        id: 'skill-1',
        isPaused: false,
      });
    });
  });

  it('opens delete modal with public warning and confirms deletion for a public skill', async () => {
    vi.mocked(actions.deleteSkillAction).mockResolvedValue({ success: true });

    render(<SkillList initialSkills={mockSkills} username="aybardev" />);

    // Click delete button
    fireEvent.click(screen.getByTestId('delete-btn-skill-1'));

    // Check modal opens and shows public warning
    expect(screen.getByRole('dialog')).toBeDefined();
    const publicWarning = screen.getByTestId('delete-public-warning');
    expect(publicWarning.textContent).toContain('Esta skill es pública');
    expect(publicWarning.textContent).toContain(
      'quienes ya la descargaron o instalaron conservan su copia local'
    );
    expect(publicWarning.textContent).toContain(
      'el registro no puede revocar copias ya distribuidas'
    );
    expect(screen.queryByTestId('delete-private-warning')).toBeNull();

    // Confirm deletion
    fireEvent.click(screen.getByTestId('confirm-delete-btn'));

    await waitFor(() => {
      expect(actions.deleteSkillAction).toHaveBeenCalledWith('skill-1');
    });
  });

  it('opens delete modal with private warning and confirms deletion for a private skill', async () => {
    vi.mocked(actions.deleteSkillAction).mockResolvedValue({ success: true });

    const privateSkills: SkillWithVersions[] = [
      {
        ...mockSkills[0],
        id: 'skill-priv-1',
        isPublic: false,
      },
    ];

    render(<SkillList initialSkills={privateSkills} username="aybardev" />);

    fireEvent.click(screen.getByTestId('delete-btn-skill-priv-1'));

    expect(screen.getByRole('dialog')).toBeDefined();
    const privateWarning = screen.getByTestId('delete-private-warning');
    expect(privateWarning.textContent).toContain('Esta skill es privada');
    expect(privateWarning.textContent).toContain(
      'al no haber estado nunca en el catálogo público, no hay copias de terceros que considerar'
    );
    expect(privateWarning.textContent).not.toContain('descargaron');
    expect(screen.queryByTestId('delete-public-warning')).toBeNull();

    fireEvent.click(screen.getByTestId('confirm-delete-btn'));

    await waitFor(() => {
      expect(actions.deleteSkillAction).toHaveBeenCalledWith('skill-priv-1');
    });
  });

  it('cancels deletion when clicking Cancelar in delete modal', async () => {
    render(<SkillList initialSkills={mockSkills} username="aybardev" />);

    fireEvent.click(screen.getByTestId('delete-btn-skill-1'));
    expect(screen.getByRole('dialog')).toBeDefined();

    fireEvent.click(screen.getByText('Cancelar'));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(actions.deleteSkillAction).not.toHaveBeenCalled();
  });

  it('renders "Archivado" badge and disables all action buttons on archived skills', () => {
    const archivedSkills: SkillWithVersions[] = [
      {
        ...mockSkills[0],
        id: 'archived-skill-1',
        isArchived: true,
      },
    ];

    render(<SkillList initialSkills={archivedSkills} username="aybardev" />);

    expect(screen.getByTestId('archived-badge').textContent).toBe('Archivado');

    const editBtn = screen.getByText('Editar') as HTMLButtonElement;
    const deleteBtn = screen.getByTestId('delete-btn-archived-skill-1') as HTMLButtonElement;
    const toggleVisBtn = screen.getByTestId('toggle-visibility-archived-skill-1') as HTMLButtonElement;
    const togglePauseBtn = screen.getByTestId('toggle-paused-archived-skill-1') as HTMLButtonElement;

    expect(editBtn.disabled).toBe(true);
    expect(deleteBtn.disabled).toBe(true);
    expect(toggleVisBtn.disabled).toBe(true);
    expect(togglePauseBtn.disabled).toBe(true);
  });

  it('switches to content tab and saves markdown content successfully', async () => {
    vi.mocked(actions.updateSkillContentAction).mockResolvedValue({
      success: true,
      data: mockSkills[0],
    });

    const handleSuccess = vi.fn();
    render(<SkillForm initialData={mockSkills[0]} onSuccess={handleSuccess} onCancel={vi.fn()} />);

    // Click on content tab
    fireEvent.click(screen.getByTestId('tab-content'));

    const textarea = screen.getByTestId('skill-content-textarea');
    expect(textarea).toBeDefined();

    const sampleContent = `---
name: awesome-agent
description: An awesome AI assistant skill
license: MIT
compatibility: "Claude Code, OpenAI Codex, Cursor >= 0.40"
metadata:
  version: "1.0.0"
  author: "aybardev"
---

## 1. Propósito y Cuándo Usar
Propósito.

## 2. Flujo de Trabajo (Workflow)
Workflow.

## 3. Reglas y Restricciones (Criterios de Diseño)
Reglas.

## 4. Árbol de Decisión (Si aplica)
Árbol.

## 5. Ejemplos Ejecutables
Ejemplos.

## 6. Manejo de Errores y Casos Excepcionales
Manejo de errores.
`;

    fireEvent.change(textarea, { target: { value: sampleContent } });
    fireEvent.click(screen.getByTestId('save-content-btn'));

    await waitFor(() => {
      expect(actions.updateSkillContentAction).toHaveBeenCalledWith({
        id: 'skill-1',
        content: sampleContent,
        isPublic: true,
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('updates skill visibility from public to private when editing in content tab of SkillForm', async () => {
    vi.mocked(actions.updateSkillContentAction).mockResolvedValue({
      success: true,
      data: { ...mockSkills[0], isPublic: false },
    });

    const handleSuccess = vi.fn();
    render(<SkillForm initialData={mockSkills[0]} onSuccess={handleSuccess} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByTestId('tab-content'));

    const sampleContent = `---
name: awesome-agent
description: An awesome AI assistant skill
license: MIT
compatibility: "Claude Code, OpenAI Codex, Cursor >= 0.40"
metadata:
  version: "1.0.0"
  author: "aybardev"
---

## 1. Propósito y Cuándo Usar
Propósito.

## 2. Flujo de Trabajo (Workflow)
Workflow.

## 3. Reglas y Restricciones (Criterios de Diseño)
Reglas.

## 4. Árbol de Decisión (Si aplica)
Árbol.

## 5. Ejemplos Ejecutables
Ejemplos.

## 6. Manejo de Errores y Casos Excepcionales
Manejo de errores.
`;

    const textarea = screen.getByTestId('skill-content-textarea');
    fireEvent.change(textarea, { target: { value: sampleContent } });

    const checkbox = screen.getByTestId('skill-content-isPublic-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    fireEvent.click(screen.getByTestId('save-content-btn'));

    await waitFor(() => {
      expect(actions.updateSkillContentAction).toHaveBeenCalledWith({
        id: 'skill-1',
        content: sampleContent,
        isPublic: false,
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('shows specific validation error when saving invalid markdown content in SkillForm', async () => {
    vi.mocked(actions.updateSkillContentAction).mockResolvedValue({
      success: false,
      error: 'Estructura del cuerpo inválida: Faltan las siguientes secciones obligatorias en el cuerpo: "## 6. Manejo de Errores y Casos Excepcionales"',
    });

    render(<SkillForm initialData={mockSkills[0]} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByTestId('tab-content'));

    const textarea = screen.getByTestId('skill-content-textarea');
    fireEvent.change(textarea, { target: { value: 'invalid content' } });
    fireEvent.click(screen.getByTestId('save-content-btn'));

    await waitFor(() => {
      const errorDiv = screen.getByTestId('form-error');
      expect(errorDiv.textContent).toContain('Faltan las siguientes secciones obligatorias');
      expect(errorDiv.textContent).toContain('6. Manejo de Errores y Casos Excepcionales');
    });
  });
});
