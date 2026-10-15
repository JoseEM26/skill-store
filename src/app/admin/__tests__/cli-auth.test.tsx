import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CliAuthPage from '../cli-auth/page';
import { CliAuthCallback } from '../cli-auth/CliAuthCallback';
import * as navigationModule from 'next/navigation';
import type { Session } from 'next-auth';
import * as tokensModule from '@/lib/auth/tokens';

const mockAuth = vi.fn();

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/auth/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/tokens')>();
  return {
    ...actual,
    createAccessToken: vi.fn(),
  };
});

describe('/admin/cli-auth Page & Callback Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CliAuthPage Server Component', () => {
    it('redirects to signin if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      await CliAuthPage({
        searchParams: Promise.resolve({ port: '54321', state: 'test-state-123' }),
      });

      expect(navigationModule.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/signin?callbackUrl=')
      );
    });

    it('shows error UI if port or state are missing or invalid', async () => {
      const mockSession: Session = {
        user: { id: 'usr-123', name: 'Tester', email: 'test@example.com' },
        expires: new Date().toISOString(),
      };
      mockAuth.mockResolvedValue(mockSession);

      // Missing state
      const jsx1 = await CliAuthPage({
        searchParams: Promise.resolve({ port: '54321' }),
      });
      if (jsx1) render(jsx1);
      expect(screen.getByText('Parámetros de autenticación inválidos o faltantes')).toBeDefined();
      expect(tokensModule.createAccessToken).not.toHaveBeenCalled();

      // Invalid port
      const jsx2 = await CliAuthPage({
        searchParams: Promise.resolve({ port: 'invalid-port', state: 'some-state' }),
      });
      if (jsx2) render(jsx2);
      expect(screen.getAllByText('Parámetros de autenticación inválidos o faltantes').length).toBeGreaterThan(0);
    });

    it('generates Personal Access Token and renders callback when session and params are valid', async () => {
      const mockSession: Session = {
        user: { id: 'usr-456', name: 'Valid User', email: 'valid@example.com' },
        expires: new Date().toISOString(),
      };
      mockAuth.mockResolvedValue(mockSession);

      vi.mocked(tokensModule.createAccessToken).mockResolvedValue({
        accessToken: {
          id: 'tok-xyz',
          ownerId: 'usr-456',
          tokenHash: 'hash',
          scopes: ['read', 'write'],
          label: 'CLI login 2026-10-07',
          expiresAt: null,
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date(),
        },
        rawToken: 'ccs_raw_token_value_mocked_1234567890123456789012345678901234567890',
      });

      const jsx = await CliAuthPage({
        searchParams: Promise.resolve({ port: '45678', state: 'valid-state-abc' }),
      });

      expect(tokensModule.createAccessToken).toHaveBeenCalledWith(
        'usr-456',
        expect.objectContaining({
          label: expect.stringContaining('CLI login '),
          scopes: ['read', 'write'],
        })
      );

      if (jsx) {
        render(jsx);
      }

      expect(screen.getByText('CloudCode Skills Registry')).toBeDefined();
      expect(screen.getByText(/Autorizando sesión CLI para/)).toBeDefined();
    });
  });

  describe('CliAuthCallback Client Component', () => {
    it('sends POST to localhost and shows success message when response is ok', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
      global.fetch = fetchMock;

      render(
        <CliAuthCallback
          port={55000}
          state="test-state-xyz"
          rawToken="ccs_raw_token_example_123456789"
        />
      );

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:55000/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'ccs_raw_token_example_123456789',
          state: 'test-state-xyz',
        }),
      });

      await waitFor(() => {
        expect(screen.getByText('Listo, podés cerrar esta pestaña.')).toBeDefined();
      });
    });

    it('shows error and manual fallback command when fetch fails', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      global.fetch = fetchMock;

      render(
        <CliAuthCallback
          port={55000}
          state="test-state-xyz"
          rawToken="ccs_raw_token_fallback_999"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No se pudo conectar con el CLI')).toBeDefined();
      });

      expect(screen.getByText(/cloudcode login --token ccs_raw_token_fallback_999/)).toBeDefined();
    });
  });
});
