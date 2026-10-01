import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContextList } from '@/components/admin/ContextList';
import { IdeaForm } from '@/components/admin/IdeaForm';
import { ExternalReferenceForm } from '@/components/admin/ExternalReferenceForm';
import type { Context } from '@prisma/client';
import * as actions from '@/app/admin/actions';

vi.mock('@/app/admin/actions', () => ({
  createIdeaAction: vi.fn(),
  updateIdeaAction: vi.fn(),
  createExternalReferenceAction: vi.fn(),
  updateExternalReferenceAction: vi.fn(),
  deleteContextAction: vi.fn(),
}));

describe('Contexts Admin UI Components', () => {
  const mockContexts: Context[] = [
    {
      id: 'ctx-idea-1',
      type: 'idea',
      title: 'Private Product Idea',
      body: 'Secret architecture ideas for AI',
      link: null,
      tags: ['product', 'secret'],
      isPublic: false,
      isArchived: false,
      ownerId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ctx-ref-2',
      type: 'external_reference',
      title: 'Next.js Official Docs',
      body: 'Framework reference link',
      link: 'https://nextjs.org/docs',
      tags: ['nextjs', 'react'],
      isPublic: true,
      isArchived: false,
      ownerId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ContextList with both items and visibility badges', () => {
    render(<ContextList initialContexts={mockContexts} />);

    expect(screen.getByText('Private Product Idea')).toBeDefined();
    expect(screen.getByText('Privada')).toBeDefined();

    expect(screen.getByText('Next.js Official Docs')).toBeDefined();
    expect(screen.getByText('Pública')).toBeDefined();
  });

  it('filters contexts by tab correctly', () => {
    render(<ContextList initialContexts={mockContexts} />);

    // Click on Ideas filter
    fireEvent.click(screen.getByText(/Ideas \(1\)/));
    expect(screen.getByText('Private Product Idea')).toBeDefined();
    expect(screen.queryByText('Next.js Official Docs')).toBeNull();

    // Click on Referencias filter
    fireEvent.click(screen.getByText(/Referencias \(1\)/));
    expect(screen.queryByText('Private Product Idea')).toBeNull();
    expect(screen.getByText('Next.js Official Docs')).toBeDefined();
  });

  it('toggles Create Idea Form when clicking + Nueva Idea', () => {
    render(<ContextList initialContexts={mockContexts} />);

    expect(screen.queryByText('Crear Nueva Idea')).toBeNull();

    fireEvent.click(screen.getByText('+ Nueva Idea'));
    expect(screen.getByText('Nueva Idea de Producto / Contexto')).toBeDefined();
  });

  it('submits IdeaForm successfully calling createIdeaAction', async () => {
    vi.mocked(actions.createIdeaAction).mockResolvedValue({
      success: true,
      data: {
        id: 'new-idea-id',
        type: 'idea',
        title: 'New Cool Idea',
        body: 'Idea body',
        link: null,
        tags: ['brainstorm'],
        isPublic: false,
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const handleSuccess = vi.fn();
    render(<IdeaForm onSuccess={handleSuccess} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Título \*/), {
      target: { value: 'New Cool Idea' },
    });
    fireEvent.change(screen.getByLabelText(/Detalle \/ Notas/), {
      target: { value: 'Idea body' },
    });
    fireEvent.change(screen.getByLabelText(/Etiquetas/), {
      target: { value: 'brainstorm, testing' },
    });

    fireEvent.click(screen.getByText('Crear Idea'));

    await waitFor(() => {
      expect(actions.createIdeaAction).toHaveBeenCalledWith({
        title: 'New Cool Idea',
        body: 'Idea body',
        tags: 'brainstorm, testing',
        isPublic: false,
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('submits ExternalReferenceForm successfully calling createExternalReferenceAction', async () => {
    vi.mocked(actions.createExternalReferenceAction).mockResolvedValue({
      success: true,
      data: {
        id: 'new-ref-id',
        type: 'external_reference',
        title: 'GitHub Docs',
        body: 'Docs for API',
        link: 'https://docs.github.com',
        tags: ['docs'],
        isPublic: true,
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const handleSuccess = vi.fn();
    render(<ExternalReferenceForm onSuccess={handleSuccess} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nombre de la herramienta/), {
      target: { value: 'GitHub Docs' },
    });
    fireEvent.change(screen.getByLabelText(/Enlace \(URL\)/), {
      target: { value: 'https://docs.github.com' },
    });

    fireEvent.click(screen.getByText('Crear Referencia'));

    await waitFor(() => {
      expect(actions.createExternalReferenceAction).toHaveBeenCalledWith({
        title: 'GitHub Docs',
        body: '',
        link: 'https://docs.github.com',
        tags: '',
        isPublic: true,
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('calls deleteContextAction on item deletion after confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(actions.deleteContextAction).mockResolvedValue({ success: true });

    render(<ContextList initialContexts={mockContexts} />);

    const deleteButtons = screen.getAllByText('Eliminar');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(actions.deleteContextAction).toHaveBeenCalledWith('ctx-idea-1');
    });
  });

  it('renders "Archivado" badge and disables Edit/Delete buttons on archived contexts', () => {
    const archivedContexts: Context[] = [
      {
        ...mockContexts[0],
        id: 'archived-ctx-1',
        isArchived: true,
      },
    ];

    render(<ContextList initialContexts={archivedContexts} />);

    expect(screen.getByTestId('archived-badge').textContent).toBe('Archivado');

    const editBtn = screen.getByText('Editar') as HTMLButtonElement;
    const deleteBtn = screen.getByText('Eliminar') as HTMLButtonElement;

    expect(editBtn.disabled).toBe(true);
    expect(deleteBtn.disabled).toBe(true);
  });
});
