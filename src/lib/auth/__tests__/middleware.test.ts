import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { createAuthJWT } from '../jwt';

describe('Auth Middleware for /admin routes', () => {
  const mockUser = {
    userId: 'usr_admin_123',
    githubId: '987654',
    username: 'adminuser',
    avatarUrl: 'https://avatar.admin.png',
  };

  it('redirects unauthenticated request on /admin to signin with callbackUrl', async () => {
    const req = new NextRequest('http://localhost:3000/admin');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/api/auth/signin');
    expect(location).toContain('callbackUrl=%2Fadmin');
  });

  it('preserves query params in callbackUrl when redirecting to signin', async () => {
    const req = new NextRequest('http://localhost:3000/admin/contexts?tab=ideas');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/api/auth/signin');
    expect(location).toContain('callbackUrl=%2Fadmin%2Fcontexts%3Ftab%3Dideas');
  });

  it('redirects when session token is invalid or tampered', async () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: 'authjs.session-token=invalid-tampered-token-value',
      },
    });
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/api/auth/signin');
  });

  it('redirects when session token is expired', async () => {
    const expiredToken = await createAuthJWT(mockUser, { maxAge: -10 });
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: `authjs.session-token=${expiredToken}`,
      },
    });
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/api/auth/signin');
  });

  it('allows access to /admin when a valid session token is provided', async () => {
    const validToken = await createAuthJWT(mockUser);
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: `authjs.session-token=${validToken}`,
      },
    });
    const res = await middleware(req);

    // NextResponse.next() returns a 200 without redirect location
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows non-admin public routes without authentication', async () => {
    const req = new NextRequest('http://localhost:3000/skills/my-skill');
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});
