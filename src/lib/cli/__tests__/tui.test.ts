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
import { saveStoredToken, readStoredToken } from '../config';
import { filterSkills, filterGroups, fetchTuiSkills, fetchTuiGroups, fetchTuiMySetup, BANNER_ASCII } from '../tui';
import { SkillSummary, GroupSummary, MySetupData } from '../client';
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
          initialMode: 'skills',
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
      const { PassThrough } = await import('node:stream');
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
        React.createElement(SkillsTui, {
          configPath,
          fetchFn: mockFetch as unknown as typeof fetch,
          ink,
          TextInput: ti.default,
          onExit: onExitSpy,
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      // Unmount / cleanup
      app.unmount();
      expect(app).toBeDefined();
    });
  });

  describe('(e) Sliding window and multi-selection (tasks 1.1 - 1.4)', () => {
    const mockEightSkills: SkillSummary[] = Array.from({ length: 8 }, (_, i) => ({
      id: `s${i + 1}`,
      slug: `skill-${i + 1}`,
      name: `Skill Name ${i + 1}`,
      description: `Description for skill ${i + 1}`,
      license: 'MIT',
      repositoryUrl: 'https://github.com/Aybar-Corp/skills',
      isPublic: true,
      isPaused: false,
      owner: 'Aybar-Corp',
      downloadsCount: i,
      installsCount: i,
      installCommand: `skills pull Aybar-Corp/skill-${i + 1}`,
      latestVersion: {
        version: `1.0.${i}`,
        publishedAt: '2026-01-01',
        changelog: 'Init',
        gitTag: `v1.0.${i}`,
      },
    }));

    it('(a) with >5 items, sliding window shows max 5 items and scrolls when navigating down', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: JSON.stringify(mockEightSkills) }],
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

      let fullStdout = '';
      fakeStdout.on('data', (chunk) => {
        fullStdout += chunk.toString();
      });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: mockFetch as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
          initialMode: 'skills',
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      // Wait for initial render
      await new Promise((resolve) => setTimeout(resolve, 60));

      const getLastFrame = () => {
        const parts = fullStdout.split('CloudCode Skills Registry - TUI');
        return parts[parts.length - 1] || '';
      };

      // Initial state: window shows items 1-5 of 8
      let frame = getLastFrame();
      expect(frame).toContain('1-5 de 8');
      expect(frame).toContain('skill-1');
      expect(frame).toContain('skill-5');
      expect(frame).not.toContain('skill-6');
      expect(frame).not.toContain('skill-7');
      expect(frame).not.toContain('skill-8');

      // Navigate down 4 times (to index 4, which is 5th item: skill-5)
      // windowStart = clamp(4 - 2, 0, 3) = 2 (items 3 to 7)
      for (let i = 0; i < 4; i++) {
        fakeStdin.write('\u001B[B');
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      frame = getLastFrame();
      expect(frame).toContain('3-7 de 8');
      expect(frame).not.toContain('skill-1');
      expect(frame).not.toContain('skill-2');
      expect(frame).toContain('skill-3');
      expect(frame).toContain('skill-7');
      expect(frame).not.toContain('skill-8');

      // Navigate down 3 more times to reach the bottom (index 7: skill-8)
      // windowStart = clamp(7 - 2, 0, 3) = 3 (items 4 to 8)
      for (let i = 0; i < 3; i++) {
        fakeStdin.write('\u001B[B');
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      frame = getLastFrame();
      expect(frame).toContain('4-8 de 8');
      expect(frame).not.toContain('skill-1');
      expect(frame).not.toContain('skill-2');
      expect(frame).not.toContain('skill-3');
      expect(frame).toContain('skill-4');
      expect(frame).toContain('skill-8');

      app.unmount();
    });

    it('(b) marking 2 items with Tab and pressing Enter triggers handlePull once for each marked item in sequence', async () => {
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

      let fullStdout = '';
      fakeStdout.on('data', (chunk) => {
        fullStdout += chunk.toString();
      });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: mockFetch as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
          onExit: onExitSpy,
          initialMode: 'skills',
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 60));

      // At index 0 (Aybar-Corp/react-forms): press Tab to mark
      fullStdout = '';
      fakeStdin.write('\t');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fullStdout).toContain('[x] Aybar-Corp/react-forms');

      // Move down to index 1 (vue-router-tools)
      fakeStdin.write('\u001B[B');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Move down to index 2 (acme-corp/internal-auth)
      fakeStdin.write('\u001B[B');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Press Tab to mark index 2
      fullStdout = '';
      fakeStdin.write('\t');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fullStdout).toContain('[x] acme-corp/internal-auth');

      // Press Enter to confirm pull for both marked items
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(pullSpy).toHaveBeenCalledTimes(2);
      expect(pullSpy).toHaveBeenNthCalledWith(
        1,
        'Aybar-Corp/react-forms',
        expect.objectContaining({ configPath })
      );
      expect(pullSpy).toHaveBeenNthCalledWith(
        2,
        'acme-corp/internal-auth',
        expect.objectContaining({ configPath })
      );
      expect(pullSpy).not.toHaveBeenCalledWith(
        'Aybar-Corp/vue-router-tools',
        expect.anything()
      );
      expect(onExitSpy).toHaveBeenCalled();

      app.unmount();
      pullSpy.mockRestore();
    });

    it('(c) without marking anything, Enter triggers pull only for the currently highlighted item (regression)', async () => {
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
          initialMode: 'skills',
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Navigate down to index 1 (vue-router-tools)
      fakeStdin.write('\u001B[B');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Press Enter without pressing space on anything
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(pullSpy).toHaveBeenCalledTimes(1);
      expect(pullSpy).toHaveBeenCalledWith(
        'Aybar-Corp/vue-router-tools',
        expect.objectContaining({ configPath })
      );
      expect(onExitSpy).toHaveBeenCalled();

      app.unmount();
      pullSpy.mockRestore();
    });
  });

  describe('(f) Group mode and group selection in TUI', () => {
    const mockGroups: GroupSummary[] = [
      {
        id: 'g1',
        name: 'stack-frontend',
        skillsCount: 3,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'g2',
        name: 'stack-backend',
        skillsCount: 2,
        createdAt: '2026-01-02',
        updatedAt: '2026-01-02',
      },
      {
        id: 'g3',
        name: 'devops-tools',
        skillsCount: 1,
        createdAt: '2026-01-03',
        updatedAt: '2026-01-03',
      },
    ];

    it('filterGroups filters groups by name case-insensitively', () => {
      expect(filterGroups(mockGroups, '')).toHaveLength(3);
      expect(filterGroups(mockGroups, 'BACKEND')).toEqual([mockGroups[1]]);
      expect(filterGroups(mockGroups, 'non-existent-group')).toHaveLength(0);
    });

    it('fetchTuiGroups calls list_groups with auth token', async () => {
      saveStoredToken(tokenUser1, configPath);
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
                  text: JSON.stringify(mockGroups),
                },
              ],
            },
          }),
        };
      });

      const res = await fetchTuiGroups({
        configPath,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${tokenUser1}`);
      expect(res.data).toHaveLength(3);
      expect(res.data?.[0].name).toBe('stack-frontend');
    });

    it('navigates to groups mode from main menu, navigates and pulls selected group on Enter', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      saveStoredToken(tokenUser1, configPath);

      const pullGroupSpy = vi.spyOn(commands, 'handlePullGroup').mockResolvedValue({
        success: true,
        message: 'Resumen: 2/2 skills descargadas con éxito.',
        data: {
          groupName: 'stack-backend',
          totalSkills: 2,
          pulledSkills: ['Aybar-Corp/api-helper', 'Aybar-Corp/db-helper'],
          failedSkills: [],
        },
      });

      const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(init?.body as string);
        const toolName = body.params?.name;

        if (toolName === 'list_groups') {
          return {
            ok: true,
            json: async () => ({
              jsonrpc: '2.0',
              id: 1,
              result: {
                content: [{ type: 'text', text: JSON.stringify(mockGroups) }],
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: {
              content: [{ type: 'text', text: JSON.stringify(mockSkills) }],
            },
          }),
        };
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

      let fullStdout = '';
      fakeStdout.on('data', (chunk) => {
        fullStdout += chunk.toString();
      });

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

      // Wait for initial render of menu
      await new Promise((resolve) => setTimeout(resolve, 60));

      // In menu, navigate down 4 times to 'Grupos' (index 4)
      for (let i = 0; i < 4; i++) {
        fakeStdin.write('\u001B[B');
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      // Press Enter to enter Grupos mode
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(fullStdout).toContain('CloudCode Skills Registry - Grupos');
      expect(fullStdout).toContain('stack-frontend');

      // Navigate down to index 1 ('stack-backend')
      fakeStdin.write('\u001B[B');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Press Enter to confirm pulling group
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(pullGroupSpy).toHaveBeenCalledTimes(1);
      expect(pullGroupSpy).toHaveBeenCalledWith(
        'stack-backend',
        expect.objectContaining({ configPath })
      );
      expect(onExitSpy).toHaveBeenCalled();

      app.unmount();
      pullGroupSpy.mockRestore();
    });

    it('typing "g" in skills mode enters text into filter without switching mode', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
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

      let fullStdout = '';
      fakeStdout.on('data', (chunk) => {
        fullStdout += chunk.toString();
      });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: mockFetch as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
          initialMode: 'skills',
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Type 'g' as search query with empty filter
      fullStdout = '';
      fakeStdin.write('g');
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Assert we remain in Skills mode and did NOT switch to Grupos mode
      expect(fullStdout).not.toContain('CloudCode Skills Registry - Grupos');
      expect(fullStdout).toContain('CloudCode Skills Registry - TUI');

      app.unmount();
    });
  });

  describe('(g) Main menu with categories and navigation', () => {
    const aliceUser = { id: 'u-alice', username: 'alice' };
    const aliceSetup: MySetupData = {
      user: {
        id: aliceUser.id,
        username: aliceUser.username,
        githubId: 'gh-alice',
        avatarUrl: null,
      },
      skills: [
        {
          id: 's-alice-pub',
          slug: 'alice-public',
          name: 'Alice Public Skill',
          description: 'Public skill by Alice',
          license: 'MIT',
          repositoryUrl: null,
          isPublic: true,
          isPaused: false,
          owner: 'alice',
          downloadsCount: 1,
          installsCount: 1,
          installCommand: 'cloudcode pull alice/alice-public',
          latestVersion: { version: '1.0.0', publishedAt: '2026-01-01', changelog: null, gitTag: null },
        },
        {
          id: 's-alice-priv',
          slug: 'alice-private',
          name: 'Alice Private Skill',
          description: 'Private skill by Alice',
          license: null,
          repositoryUrl: null,
          isPublic: false,
          isPaused: false,
          owner: 'alice',
          downloadsCount: 0,
          installsCount: 0,
          installCommand: 'cloudcode pull alice/alice-private',
          latestVersion: { version: '0.1.0', publishedAt: '2026-01-01', changelog: null, gitTag: null },
        },
      ],
      contexts: { ideas: [], externalReferences: [] },
    };

    const combinedSkills: SkillSummary[] = [
      aliceSetup.skills[0],
      {
        id: 's-bob-pub',
        slug: 'bob-public',
        name: 'Bob Public Skill',
        description: 'Community skill by Bob',
        license: 'MIT',
        repositoryUrl: null,
        isPublic: true,
        isPaused: false,
        owner: 'bob',
        downloadsCount: 5,
        installsCount: 3,
        installCommand: 'cloudcode pull bob/bob-public',
        latestVersion: { version: '2.0.0', publishedAt: '2026-01-02', changelog: null, gitTag: null },
      },
      {
        id: 's-charlie-paused',
        slug: 'charlie-paused',
        name: 'Charlie Paused Skill',
        description: 'Paused public skill by Charlie',
        license: 'MIT',
        repositoryUrl: null,
        isPublic: true,
        isPaused: true,
        owner: 'charlie',
        downloadsCount: 0,
        installsCount: 0,
        installCommand: 'cloudcode pull charlie/charlie-paused',
        latestVersion: { version: '1.0.0', publishedAt: '2026-01-03', changelog: null, gitTag: null },
      },
    ];

    const createMockFetch = () =>
      vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(init?.body as string);
        const toolName = body.params?.name;
        if (toolName === 'get_my_setup') {
          return {
            ok: true,
            json: async () => ({
              jsonrpc: '2.0',
              id: 1,
              result: {
                content: [{ type: 'text', text: JSON.stringify(aliceSetup) }],
              },
            }),
          };
        }
        if (toolName === 'list_skills') {
          return {
            ok: true,
            json: async () => ({
              jsonrpc: '2.0',
              id: 1,
              result: {
                content: [{ type: 'text', text: JSON.stringify(combinedSkills) }],
              },
            }),
          };
        }
        return { ok: false, status: 400 };
      });

    it('fetchTuiMySetup calls get_my_setup with auth token', async () => {
      saveStoredToken(tokenUser1, configPath);
      let capturedHeaders: Record<string, string> = {};
      const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedHeaders = init?.headers || {};
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: {
              content: [{ type: 'text', text: JSON.stringify(aliceSetup) }],
            },
          }),
        };
      });

      const res = await fetchTuiMySetup({
        configPath,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${tokenUser1}`);
      expect(res.data?.user.username).toBe('alice');
      expect(res.data?.skills).toHaveLength(2);
    });

    it('renders the main menu first upon mounting with expected options and footer', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
      }
      class FakeStdout extends PassThrough {
        isTTY = true;
        columns = 80;
        rows = 24;
      }

      const fakeStdin = new FakeStdin();
      const fakeStdout = new FakeStdout();
      const fakeStderr = new FakeStdout();
      let fullStdout = '';
      fakeStdout.on('data', (chunk) => { fullStdout += chunk.toString(); });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: createMockFetch() as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(fullStdout).toContain(BANNER_ASCII[0]);
      expect(fullStdout).toContain(BANNER_ASCII[4]);
      expect(fullStdout).toContain('CloudCode Skills Registry - Menú Principal');
      expect(fullStdout).toContain('🔍 Explorar todas');
      expect(fullStdout).toContain('👤 Mis skills públicas');
      expect(fullStdout).toContain('🔒 Mis skills privadas');
      expect(fullStdout).toContain('🌐 Skills públicas de la comunidad');
      expect(fullStdout).toContain('📦 Grupos');
      expect(fullStdout).toContain('🔑 Iniciar sesión');
      expect(fullStdout).toContain('Salir');
      expect(fullStdout).toContain('↑/↓: Navegar | Enter: Entrar | Esc/q: Salir');

      app.unmount();
    });

    it('navigates to Explorar todas (index 0) on Enter', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
      }
      class FakeStdout extends PassThrough {
        isTTY = true;
        columns = 100;
        rows = 24;
      }

      const fakeStdin = new FakeStdin();
      const fakeStdout = new FakeStdout();
      const fakeStderr = new FakeStdout();
      let fullStdout = '';
      fakeStdout.on('data', (chunk) => { fullStdout += chunk.toString(); });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: createMockFetch() as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Press Enter at option 0 (Explorar todas)
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(fullStdout).toContain('CloudCode Skills Registry - TUI');
      expect(fullStdout).toContain('alice/alice-public');
      expect(fullStdout).toContain('bob/bob-public');
      expect(fullStdout).toContain('charlie/charlie-paused');
      expect(fullStdout.replace(/\s+/g, ' ')).toContain('Esc: Volver al menú');

      app.unmount();
    });

    it('navigates to Mis skills públicas (index 1) on Enter', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
      }
      class FakeStdout extends PassThrough {
        isTTY = true;
        columns = 80;
        rows = 24;
      }

      const fakeStdin = new FakeStdin();
      const fakeStdout = new FakeStdout();
      const fakeStderr = new FakeStdout();
      let fullStdout = '';
      fakeStdout.on('data', (chunk) => { fullStdout += chunk.toString(); });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: createMockFetch() as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Move down once to index 1 (Mis skills públicas)
      fakeStdin.write('\u001B[B');
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Press Enter
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(fullStdout).toContain('Mis skills públicas');
      expect(fullStdout).toContain('alice/alice-public');
      expect(fullStdout).not.toContain('alice/alice-private');
      expect(fullStdout).not.toContain('bob/bob-public');

      app.unmount();
    });

    it('navigates to Mis skills privadas (index 2) on Enter', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
      }
      class FakeStdout extends PassThrough {
        isTTY = true;
        columns = 80;
        rows = 24;
      }

      const fakeStdin = new FakeStdin();
      const fakeStdout = new FakeStdout();
      const fakeStderr = new FakeStdout();
      let fullStdout = '';
      fakeStdout.on('data', (chunk) => { fullStdout += chunk.toString(); });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: createMockFetch() as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Move down twice to index 2 (Mis skills privadas)
      fakeStdin.write('\u001B[B');
      await new Promise((resolve) => setTimeout(resolve, 30));
      fakeStdin.write('\u001B[B');
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Press Enter
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(fullStdout).toContain('Mis skills privadas');
      expect(fullStdout).toContain('alice/alice-private');
      expect(fullStdout).not.toContain('alice/alice-public');
      expect(fullStdout).not.toContain('bob/bob-public');

      app.unmount();
    });

    it('navigates to Skills públicas de la comunidad (index 3) on Enter', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
      }
      class FakeStdout extends PassThrough {
        isTTY = true;
        columns = 80;
        rows = 24;
      }

      const fakeStdin = new FakeStdin();
      const fakeStdout = new FakeStdout();
      const fakeStderr = new FakeStdout();
      let fullStdout = '';
      fakeStdout.on('data', (chunk) => { fullStdout += chunk.toString(); });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: createMockFetch() as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Move down 3 times to index 3 (Skills públicas de la comunidad)
      for (let i = 0; i < 3; i++) {
        fakeStdin.write('\u001B[B');
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      // Press Enter
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(fullStdout).toContain('Skills de la comunidad');
      expect(fullStdout).toContain('bob/bob-public');
      // Must exclude own skills and paused skills
      expect(fullStdout).not.toContain('alice/alice-public');
      expect(fullStdout).not.toContain('charlie/charlie-paused');

      app.unmount();
    });

    it('Escape from a list returns to the main menu without exiting', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
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
      let fullStdout = '';
      fakeStdout.on('data', (chunk) => { fullStdout += chunk.toString(); });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: createMockFetch() as unknown as typeof fetch,
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

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Enter option 0 (Explorar todas)
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(fullStdout).toContain('CloudCode Skills Registry - TUI');

      // Now press Escape to return to menu
      fullStdout = '';
      fakeStdin.write('\u001B');
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Assert we are back in menu and onExit was NOT called
      expect(fullStdout).toContain(BANNER_ASCII[0]);
      expect(fullStdout).toContain('CloudCode Skills Registry - Menú Principal');
      expect(fullStdout).toContain('🔍 Explorar todas');
      expect(onExitSpy).not.toHaveBeenCalled();

      app.unmount();
    });

    it('Escape from the main menu exits cleanly', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
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
          fetchFn: createMockFetch() as unknown as typeof fetch,
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

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Press Escape from menu
      fakeStdin.write('\u001B');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onExitSpy).toHaveBeenCalled();
      app.unmount();
    });

    it('q from the main menu exits cleanly', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
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
          fetchFn: createMockFetch() as unknown as typeof fetch,
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

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Press 'q' from menu
      fakeStdin.write('q');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onExitSpy).toHaveBeenCalled();
      app.unmount();
    });

    it('shows 🚪 Cerrar sesión when a stored token is present', async () => {
      saveStoredToken(tokenUser1, configPath);
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
      }
      class FakeStdout extends PassThrough {
        isTTY = true;
        columns = 100;
        rows = 24;
      }

      const fakeStdin = new FakeStdin();
      const fakeStdout = new FakeStdout();
      const fakeStderr = new FakeStdout();
      let fullStdout = '';
      fakeStdout.on('data', (chunk) => { fullStdout += chunk.toString(); });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: createMockFetch() as unknown as typeof fetch,
          ink,
          TextInput: ti.default || (ti as unknown as typeof import('ink-text-input').default),
        }),
        {
          stdin: fakeStdin as unknown as NodeJS.ReadStream,
          stdout: fakeStdout as unknown as NodeJS.WriteStream,
          stderr: fakeStderr as unknown as NodeJS.WriteStream,
          patchConsole: false,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(fullStdout).toContain('🚪 Cerrar sesión');
      expect(fullStdout).not.toContain('🔑 Iniciar sesión');

      app.unmount();
    });

    it('navigates to 🔑 Iniciar sesión (index 5) when unauthenticated and exits with instructions', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
      }
      class FakeStdout extends PassThrough {
        isTTY = true;
        columns = 100;
        rows = 24;
      }

      const fakeStdin = new FakeStdin();
      const fakeStdout = new FakeStdout();
      const fakeStderr = new FakeStdout();
      const onExitSpy = vi.fn();
      let fullStdout = '';
      fakeStdout.on('data', (chunk) => { fullStdout += chunk.toString(); });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          baseUrl: 'http://localhost:3000',
          fetchFn: createMockFetch() as unknown as typeof fetch,
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

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Move down 5 times to index 5 (🔑 Iniciar sesión)
      for (let i = 0; i < 5; i++) {
        fakeStdin.write('\u001B[B');
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      // Press Enter
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(onExitSpy).toHaveBeenCalled();
      expect(fullStdout).toContain('Para iniciar sesión corré: cloudcode login --token <tu_token>');
      expect(fullStdout).toContain('Generá un token en http://localhost:3000/admin/tokens si no tenés uno.');

      app.unmount();
    });

    it('navigates to 🚪 Cerrar sesión (index 5) when authenticated, clears stored token, and exits with confirmation', async () => {
      saveStoredToken(tokenUser1, configPath);
      expect(readStoredToken(configPath)).toBe(tokenUser1);

      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
      }
      class FakeStdout extends PassThrough {
        isTTY = true;
        columns = 100;
        rows = 24;
      }

      const fakeStdin = new FakeStdin();
      const fakeStdout = new FakeStdout();
      const fakeStderr = new FakeStdout();
      const onExitSpy = vi.fn();
      let fullStdout = '';
      fakeStdout.on('data', (chunk) => { fullStdout += chunk.toString(); });

      const app = ink.render(
        React.createElement(SkillsTuiInner, {
          configPath,
          fetchFn: createMockFetch() as unknown as typeof fetch,
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

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Move down 5 times to index 5 (🚪 Cerrar sesión)
      for (let i = 0; i < 5; i++) {
        fakeStdin.write('\u001B[B');
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      // Press Enter
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(onExitSpy).toHaveBeenCalled();
      expect(fullStdout).toContain('Sesión cerrada correctamente.');
      expect(readStoredToken(configPath)).toBeNull();

      app.unmount();
    });

    it('navigates to Salir (index 6) on Enter and exits', async () => {
      const { PassThrough } = await import('node:stream');
      const React = (await import('react')).default;
      const { SkillsTuiInner, loadEsm } = await import('../tui');
      const ink = await loadEsm<typeof import('ink')>('ink');
      const ti = await loadEsm<{ default: typeof import('ink-text-input').default }>('ink-text-input');

      class FakeStdin extends PassThrough {
        isTTY = true;
        setRawMode() { return this; }
        ref() { return this; }
        unref() { return this; }
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
          fetchFn: createMockFetch() as unknown as typeof fetch,
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

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Move down 6 times to index 6 (Salir)
      for (let i = 0; i < 6; i++) {
        fakeStdin.write('\u001B[B');
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      // Press Enter
      fakeStdin.write('\r');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onExitSpy).toHaveBeenCalled();
      app.unmount();
    });
  });
});


