import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboardPage from '../admin/page';
import * as navigationModule from 'next/navigation';
import type { Session } from 'next-auth';

const mockAuth = vi.fn();

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('AdminDashboardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to signin if user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    await AdminDashboardPage();

    expect(navigationModule.redirect).toHaveBeenCalledWith('/api/auth/signin?callbackUrl=/admin');
  });

  it('renders user details and admin sections when user is authenticated', async () => {
    const mockSession: Session = {
      user: {
        id: 'usr_cuid_999',
        name: 'Jane Developer',
        email: 'jane@example.com',
        image: 'https://avatar.dev/jane.png',
      },
      expires: new Date().toISOString(),
    };
    (mockSession.user as unknown as { username: string; githubId: string }).username = 'janedev';
    (mockSession.user as unknown as { username: string; githubId: string }).githubId = '1234567';

    mockAuth.mockResolvedValue(mockSession);

    const jsx = await AdminDashboardPage();
    if (jsx) {
      render(jsx);
    }

    expect(screen.getByText('Panel de Administración')).toBeDefined();
    expect(screen.getByText('Jane Developer')).toBeDefined();
    expect(screen.getByText('@janedev')).toBeDefined();
    expect(screen.getByText('Cerrar sesión')).toBeDefined();
    expect(screen.getByText('Ideas y Contextos')).toBeDefined();
    expect(screen.getByText('Mis Skills')).toBeDefined();
    expect(screen.getByText('Tokens de Acceso MCP')).toBeDefined();
  });
});
