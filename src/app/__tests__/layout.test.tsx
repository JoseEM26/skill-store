import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RootLayout from '../layout';
import type { Session } from 'next-auth';

const mockAuth = vi.fn();

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
  signOut: vi.fn(),
}));

vi.mock('@/lib/auth/actions', () => ({
  signOutAction: vi.fn(),
}));

describe('RootLayout Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in button when no session is active', async () => {
    mockAuth.mockResolvedValue(null);

    const jsx = await RootLayout({
      children: <div data-testid="test-child">Hello Page</div>,
    });

    render(jsx);

    expect(screen.getByText('Sign in with GitHub')).toBeDefined();
    expect(screen.getByTestId('test-child')).toBeDefined();
    expect(screen.queryByTestId('user-menu-trigger')).toBeNull();
  });

  it('renders user menu when session is active', async () => {
    const mockSession: Session = {
      user: {
        id: 'usr_abc_123',
        name: 'Dev User',
        image: 'https://example.com/avatar.png',
      },
      expires: new Date().toISOString(),
    };
    (mockSession.user as unknown as { username: string }).username = 'devuser';

    mockAuth.mockResolvedValue(mockSession);

    const jsx = await RootLayout({
      children: <div data-testid="test-child">Hello Page</div>,
    });

    render(jsx);

    expect(screen.queryByText('Sign in with GitHub')).toBeNull();
    expect(screen.getByTestId('user-menu-trigger')).toBeDefined();
    expect(screen.getByText('devuser')).toBeDefined();
    expect(screen.getByTestId('test-child')).toBeDefined();
  });
});
