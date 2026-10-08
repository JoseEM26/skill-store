import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserMenu } from '../UserMenu';

vi.mock('@/lib/auth/actions', () => ({
  signOutAction: vi.fn(),
}));

describe('UserMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login button and NOT user menu when user is null', () => {
    render(<UserMenu user={null} />);

    const loginButton = screen.getByText('Sign in with GitHub');
    expect(loginButton).toBeDefined();
    expect(loginButton.closest('a')?.getAttribute('href')).toBe('/login');
    expect(screen.queryByTestId('user-menu-trigger')).toBeNull();
    expect(screen.queryByTestId('user-menu-dropdown')).toBeNull();
  });

  it('renders avatar and username and NOT login button when user is authenticated', () => {
    const mockUser = {
      id: 'user-123',
      name: 'Alice Wonder',
      username: 'alicew',
      image: 'https://example.com/avatar.jpg',
    };

    render(<UserMenu user={mockUser} />);

    expect(screen.queryByText('Sign in with GitHub')).toBeNull();
    const trigger = screen.getByTestId('user-menu-trigger');
    expect(trigger).toBeDefined();
    expect(screen.getByText('alicew')).toBeDefined();

    const avatarImg = screen.getByAltText('alicew');
    expect(avatarImg.getAttribute('src')).toBe('https://example.com/avatar.jpg');

    // Dropdown should initially be closed
    expect(screen.queryByTestId('user-menu-dropdown')).toBeNull();
  });

  it('renders initial fallback when user has no image', () => {
    const mockUser = {
      id: 'user-123',
      name: 'Bob Builder',
      username: 'bob',
      image: null,
    };

    render(<UserMenu user={mockUser} />);

    expect(screen.getByText('B')).toBeDefined();
    expect(screen.getByText('bob')).toBeDefined();
  });

  it('opens dropdown and displays profile, admin panel, and sign out options on trigger click', () => {
    const mockUser = {
      id: 'user-123',
      name: 'Jane Doe',
      username: 'janedoe',
      image: 'https://example.com/jane.jpg',
    };

    render(<UserMenu user={mockUser} />);

    const trigger = screen.getByTestId('user-menu-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('user-menu-dropdown')).toBeDefined();
    expect(screen.getByText('Ver perfil')).toBeDefined();
    expect(screen.getByText('Panel de Administración')).toBeDefined();
    expect(screen.getByText('Cerrar sesión')).toBeDefined();

    const profileLink = screen.getByText('Ver perfil').closest('a');
    expect(profileLink?.getAttribute('href')).toBe('/admin');

    const adminLink = screen.getByText('Panel de Administración').closest('a');
    expect(adminLink?.getAttribute('href')).toBe('/admin');
  });

  it('closes dropdown when clicking outside', () => {
    const mockUser = {
      id: 'user-123',
      username: 'janedoe',
    };

    render(
      <div>
        <div data-testid="outside">Outside Area</div>
        <UserMenu user={mockUser} />
      </div>
    );

    const trigger = screen.getByTestId('user-menu-trigger');
    fireEvent.click(trigger);
    expect(screen.getByTestId('user-menu-dropdown')).toBeDefined();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByTestId('user-menu-dropdown')).toBeNull();
  });
});
