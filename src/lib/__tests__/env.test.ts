import { describe, it, expect } from 'vitest';
import { validateEnv } from '../env';

describe('Environment validation', () => {
  it('validates environment with default and provided values', () => {
    const valid = validateEnv({
      DATABASE_URL: 'postgresql://localhost:5433/test',
      GITHUB_ID: 'gh_123',
      GITHUB_SECRET: 'gh_secret',
      AUTH_SECRET: 'supersecret',
      AUTH_SESSION_MAX_AGE: '3600',
    });

    expect(valid.DATABASE_URL).toBe('postgresql://localhost:5433/test');
    expect(valid.GITHUB_ID).toBe('gh_123');
    expect(valid.GITHUB_SECRET).toBe('gh_secret');
    expect(valid.AUTH_SECRET).toBe('supersecret');
    expect(valid.AUTH_SESSION_MAX_AGE).toBe(3600);
  });

  it('uses default values when optional auth vars are missing', () => {
    const valid = validateEnv({
      DATABASE_URL: 'postgresql://localhost:5433/test',
    });

    expect(valid.AUTH_SESSION_MAX_AGE).toBe(2592000);
    expect(valid.GITHUB_ID).toBe('dummy-github-id');
  });

  it('fails if DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow('Invalid environment variables');
  });
});
