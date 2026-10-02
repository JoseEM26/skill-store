/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Console } from 'node:console';
import fs from 'fs';
import path from 'path';
import os from 'os';

if (!globalThis.console.Console) {
  (globalThis.console as unknown as { Console: typeof Console }).Console = Console;
}
import { prisma } from '@/lib/prisma';
import { createAccessToken } from '@/lib/auth/tokens';
import { saveStoredToken } from '../config';
import { filterSkills, fetchTuiSkills } from '../tui';
import { SkillSummary } from '../client';
import * as commands from '../commands';

describe('TUI Tests', () => {
  let tempDir: string;
  let configPath: string;
  let user1: { id: string; githubId: string; username: string };
  let tokenUser1: string;

  const mockSkills: SkillSummary[] = [
    {
      id: 's1',
      slug: 'react-forms',
      name: 'React Form Helpers',
      description: 'Components and hooks for React forms validation',
      license: 'MIT',
      repositoryUrl: 'https://github.com/Aybar-Corp/skills',
      isPublic: true,
      isPaused: false,
      owner: 'Aybar-Corp',
      downloadsCount: 10,
      installsCount: 5,
      installCommand: 'skills pull Aybar-Corp/react-forms',
      latestVersion: {
        version: '1.0.0',
        publishedAt: '2026-01-01',
        changelog: 'Initial release',
        gitTag: 'v1.0.0',
      },
    },
    {
      id: 's2',
      slug: 'vue-router-tools',
      name: 'Vue Router Tools',
      description: 'Navigation guards and route helpers for Vue 3',
      license: 'MIT',
      repositoryUrl: 'https://github.com/Aybar-Corp/skills',
      isPublic: true,
      isPaused: false,
      owner: 'Aybar-Corp',
      downloadsCount: 8,
      installsCount: 3,
      installCommand: 'skills pull Aybar-Corp/vue-router-tools',
      latestVersion: {
        version: '2.1.0',
        publishedAt: '2026-01-02',
        changelog: 'Upgrade',
        gitTag: 'v2.1.0',
      },
    },
    {
      id: 's3',
      slug: 'internal-auth',
      name: 'Internal Auth Module',
      description: 'Enterprise SSO integration for private apps',
      license: null,
      repositoryUrl: null,
      isPublic: false,
      isPaused: true,
      owner: 'acme-corp',
      downloadsCount: 0,
      installsCount: 0,
      installCommand: 'skills pull acme-corp/internal-auth',
      latestVersion: {
        version: '0.1.0',
        publishedAt: '2026-01-03',
        changelog: 'WIP',
        gitTag: null,
      },
    },
  ];

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-tui-test-'));
    configPath = path.join(tempDir, 'config.json');

    user1 = await prisma.user.create({
      data: {
        githubId: `tui-test-u1-${Date.now()}`,
        username: `tui_u1_${Date.now()}`,
      },
    });

    const tok1 = await createAccessToken(user1.id, {
      label: 'TUI Test Token',
      scopes: ['read'],
    });
    tokenUser1 = tok1.rawToken;
  });

  afterEach(async () => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}

    if (user1?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: user1.id } });
      await prisma.user.deleteMany({ where: { id: user1.id } });
    }
  });

  describe('(a) Live filtering logic (filterSkills)', () => {
    it('returns all skills when filter query is empty or whitespace', () => {
      expect(filterSkills(mockSkills, '')).toHaveLength(3);
      expect(filterSkills(mockSkills, '   ')).toHaveLength(3);
    });

    it('filters skills by name (case-insensitive)', () => {
      const results = filterSkills(mockSkills, 'REACT');
      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe('react-forms');
    });

    it('filters skills by slug', () => {
      const results = filterSkills(mockSkills, 'vue-router');
      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe('vue-router-tools');
    });

    it('filters skills by description', () => {
      const results = filterSkills(mockSkills, 'Enterprise SSO');
      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe('internal-auth');
    });

    it('filters skills by owner/slug identifier', () => {
      const results = filterSkills(mockSkills, 'acme-corp/internal');
      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe('internal-auth');
    });

    it('returns empty array when no skills match', () => {
      const results = filterSkills(mockSkills, 'nonexistent-skill-query-xyz');
      expect(results).toHaveLength(0);
    });
  });

  describe('(b) Selection and pull dispatch', () => {
    it('navigates with down arrow and triggers handlePull with the second skill on Enter', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      const pullSpy = vi.spyOn(commands, 'handlePull').mockResolvedValue({
        success: true,
        message: '✅ Skill descargada con éxito',
        data: { targetDir: '/tmp/test', filesWritten: ['SKILL.md'] },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: JSON.stringify(mockSkills) }],
          },
        }),
      });

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() {
          return this;
        }
        ref() {
          return this;
        }
        unref() {
          return this;
        }
      }

      class FakeStdout extends PassThrough {
        isTTY = true;
        columns = 80;
        rows = 24;
      }

      const fakeStdin = new FakeStdin();
      const fakeStdout = new FakeStdout();
      const fakeStderr = new FakeStdout();
      const onExitSpy = vi.fn();

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: mockFetch as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
          onExit: onExitSpy,
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      // Wait for initial fetch to resolve and component to render
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Press down arrow to move selection from index 0 (react-forms) to index 1 (vue-router-tools)
      fakeStdin.write('\u001B[B');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Press Enter to confirm selection
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert handlePull was called with the second item (Aybar-Corp/vue-router-tools)
      expect(pullSpy).toHaveBeenCalledWith(
        'Aybar-Corp/vue-router-tools',
        expect.objectContaining({ configPath })
      );
      expect(pullSpy).not.toHaveBeenCalledWith(
        'Aybar-Corp/react-forms',
        expect.anything()
      );

      app.unmount();
      pullSpy.mockRestore();
    });

    it('exits cleanly on Escape without triggering handlePull', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      const pullSpy = vi.spyOn(commands, 'handlePull').mockResolvedValue({
        success: true,
        message: '✅ Skill descargada con éxito',
        data: { targetDir: '/tmp/test', filesWritten: ['SKILL.md'] },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: JSON.stringify(mockSkills) }],
          },
        }),
      });

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() {
          return this;
        }
        ref() {
          return this;
        }
        unref() {
          return this;
        }
      }

      class FakeStdout extends PassThrough {
        isTTY = true;
        columns = 80;
        rows = 24;
      }

      const fakeStdin = new FakeStdin();
      const fakeStdout = new FakeStdout();
      const fakeStderr = new FakeStdout();
      const onExitSpy = vi.fn();

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: mockFetch as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
          onExit: onExitSpy,
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      // Wait for initial fetch to resolve
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Press Escape without navigating
      fakeStdin.write('\u001B');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(pullSpy).not.toHaveBeenCalled();
      expect(onExitSpy).toHaveBeenCalled();

      app.unmount();
      pullSpy.mockRestore();
    });
  });

  describe('(c) Authenticated vs Unauthenticated TUI fetching', () => {
    it('fetches without token when no session is active', async () => {
      let capturedHeaders: Record<string, string> = {};
      const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedHeaders = init?.headers || {};
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify([mockSkills[0], mockSkills[1]]),
                },
              ],
            },
          }),
        };
      });

      const res = await fetchTuiSkills({
        configPath,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(2);
      expect(capturedHeaders['Authorization']).toBeUndefined();
    });

    it('fetches with Bearer token when session is active, exposing private/paused own skills', async () => {
      saveStoredToken(tokenUser1, configPath);
      let capturedHeaders: Record<string, string> = {};

      const ownPrivateSkill: SkillSummary = {
        id: 's-own',
        slug: 'my-private-skill',
        name: 'My Private Skill',
        description: 'Only for me',
        license: null,
        repositoryUrl: null,
        isPublic: false,
        isPaused: true,
        owner: user1.username,
        downloadsCount: 0,
        installsCount: 0,
        installCommand: `skills pull ${user1.username}/my-private-skill`,
        latestVersion: {
          version: '0.0.1',
          publishedAt: '2026-01-01',
          changelog: null,
          gitTag: null,
        },
      };

      const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedHeaders = init?.headers || {};
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify([mockSkills[0], ownPrivateSkill]),
                },
              ],
            },
          }),
        };
      });

      const res = await fetchTuiSkills({
        configPath,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${tokenUser1}`);
      expect(res.data).toHaveLength(2);
      expect(res.data?.some((s) => s.owner === user1.username && !s.isPublic && s.isPaused)).toBe(true);
    });
  });

  describe('(d) SkillsTui Component Lifecycle', () => {
    it('initializes and exits cleanly', async () => {
      const React = (await import('react')).default;
      const { SkillsTui, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: JSON.stringify(mockSkills) }],
          },
        }),
      });

      const onExitSpy = vi.fn();
      const app = ink.render(
        React.createElement(SkillsTui, {
          configPath,
          fetchFn: mockFetch as unknown as typeof fetch,
          ink,
          TextInput: ti.default,
          onExit: onExitSpy,
        })
      );

      // Unmount / cleanup
      app.unmount();
      expect(app).toBeDefined();
    });
  });
});

