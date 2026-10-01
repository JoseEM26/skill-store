import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TokenList } from '@/components/admin/TokenList';
import { TokenForm } from '@/components/admin/TokenForm';
import { TokenRevealModal } from '@/components/admin/TokenRevealModal';
import type { AccessToken } from '@prisma/client';
import * as actions from '@/app/admin/actions';

vi.mock('@/app/admin/actions', () => ({
  createAccessTokenAction: vi.fn(),
  revokeAccessTokenAction: vi.fn(),
}));

describe('Tokens Admin UI Components', () => {
  const mockTokens: AccessToken[] = [
    {
      id: 'tok-1',
      ownerId: 'user-1',
      tokenHash: 'hash1',
      scopes: ['read', 'write'],
      label: 'Active Agent Token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days future
      lastUsedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    },
    {
      id: 'tok-2',
      ownerId: 'user-1',
      tokenHash: 'hash2',
      scopes: ['delete'],
      label: 'Revoked CI Token',
      expiresAt: null,
      lastUsedAt: null,
      revokedAt: new Date(),
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders TokenList with active and revoked tokens, labels, and scopes', () => {
    render(<TokenList initialTokens={mockTokens} />);

    expect(screen.getByText('Active Agent Token')).toBeDefined();
    expect(screen.getByText('Activo')).toBeDefined();
    expect(screen.getByText('Revoked CI Token')).toBeDefined();
    expect(screen.getByText('Revocado')).toBeDefined();
    expect(screen.getByText('read')).toBeDefined();
    expect(screen.getByText('write')).toBeDefined();
    expect(screen.getByText('delete')).toBeDefined();
  });

  it('toggles TokenForm when clicking + Generar Nuevo Token', () => {
    render(<TokenList initialTokens={mockTokens} />);

    expect(screen.queryByText('Generar Nuevo Token de Acceso MCP')).toBeNull();

    fireEvent.click(screen.getByText('+ Generar Nuevo Token'));
    expect(screen.getByText('Generar Nuevo Token de Acceso MCP')).toBeDefined();
  });

  it('submits TokenForm successfully and triggers onSuccess with rawToken', async () => {
    vi.mocked(actions.createAccessTokenAction).mockResolvedValue({
      success: true,
      data: {
        rawToken: 'ccs_supersecretrawtoken12345678901234567890123456789012345678901234',
        accessToken: {
          id: 'new-tok-id',
          ownerId: 'user-1',
          tokenHash: 'newhash',
          scopes: ['read', 'write'],
          label: 'My New Agent',
          expiresAt: null,
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date(),
        },
      },
    });

    const handleSuccess = vi.fn();
    render(<TokenForm onSuccess={handleSuccess} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nombre \/ Etiqueta del Token/), {
      target: { value: 'My New Agent' },
    });

    fireEvent.click(screen.getByText('Generar Token'));

    await waitFor(() => {
      expect(actions.createAccessTokenAction).toHaveBeenCalled();
      expect(handleSuccess).toHaveBeenCalledWith(
        'ccs_supersecretrawtoken12345678901234567890123456789012345678901234',
        'My New Agent'
      );
    });
  });

  it('renders TokenRevealModal and allows copying rawToken to clipboard', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const handleClose = vi.fn();
    render(
      <TokenRevealModal
        rawToken="ccs_supersecretrawtoken12345678901234567890123456789012345678901234"
        label="My New Agent"
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Token de Acceso Generado')).toBeDefined();
    expect(screen.getByDisplayValue('ccs_supersecretrawtoken12345678901234567890123456789012345678901234')).toBeDefined();

    const copyBtn = screen.getByTestId('copy-token-btn');
    await React.act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'ccs_supersecretrawtoken12345678901234567890123456789012345678901234'
    );

    const closeBtn = screen.getByTestId('close-token-modal-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls revokeAccessTokenAction when clicking Revocar Token after confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(actions.revokeAccessTokenAction).mockResolvedValue({ success: true });

    render(<TokenList initialTokens={mockTokens} />);

    const revokeBtn = screen.getByText('Revocar Token');
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(actions.revokeAccessTokenAction).toHaveBeenCalledWith('tok-1');
    });
  });
});
