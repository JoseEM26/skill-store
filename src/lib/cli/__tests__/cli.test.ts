import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/prisma';
import { createAccessToken } from '@/lib/auth/tokens';
import { clearStoredToken, readStoredToken, saveStoredToken } from '../config';
import { handleLogin, handleLogout, handleWhoami, handleListOrSearch, handlePull, handlePullGroup } from '../commands';
import * as commands from '../commands';
import { main } from '../../../../bin/skills-cli';

describe('CLI Standalone Tests', () => {
  let tempDir: string;
  let configPath: string;
  let user1: { id: string; githubId: string; username: string };
  let user2: { id: string; githubId: string; username: string };
  let tokenUser1: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-cli-test-'));
    configPath = path.join(tempDir, 'config.json');

    // Create test users in DB
    user1 = await prisma.user.create({
      data: {
        githubId: `cli-test-u1-${Date.now()}`,
        username: `cli_u1_${Date.now()}`,
      },
    });

    user2 = await prisma.user.create({
      data: {
        githubId: `cli-test-u2-${Date.now()}`,
        username: `cli_u2_${Date.now()}`,
      },
    });

    const tok1 = await createAccessToken(user1.id, {
      label: 'CLI Test Token',
      scopes: ['read'],
    });
    tokenUser1 = tok1.rawToken;
  });

  afterEach(async () => {
    // Cleanup files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}

    // Cleanup DB
    if (user1?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: { in: [user1.id, user2.id] } } });
      await prisma.skillVersion.deleteMany({
        where: { skill: { ownerId: { in: [user1.id, user2.id] } } },
      });
      await prisma.skill.deleteMany({ where: { ownerId: { in: [user1.id, user2.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
    }
  });

  describe('2.1 Login and Whoami', () => {
    it('saves token in config file upon login', async () => {
      const res = await handleLogin({ token: 'test_pat_123', configPath });
      expect(res.success).toBe(true);
      expect(fs.existsSync(configPath)).toBe(true);
      expect(readStoredToken(configPath)).toBe('test_pat_123');
    });

    it('fails login if token is empty', async () => {
      const res = await handleLogin({ token: '', configPath });
      expect(res.success).toBe(false);
      expect(res.message).toContain('Token no especificado');
    });

    it('whoami reports clearly when there is no active session', async () => {
      const res = await handleWhoami({ configPath });
      expect(res.success).toBe(false);
      expect(res.message).toContain('No hay sesión activa');
    });

    it('whoami reports active session when token is valid', async () => {
      saveStoredToken(tokenUser1, configPath);

      // Mock fetch returning successful JSON-RPC get_my_setup
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  user: { id: user1.id, username: user1.username },
                  skills: [],
                  contexts: { ideas: [], externalReferences: [] },
                }),
              },
            ],
          },
        }),
      });

      const res = await handleWhoami({ configPath, fetchFn: mockFetch as unknown as typeof fetch });
      expect(res.success).toBe(true);
      expect(res.message).toContain(`@${user1.username}`);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('whoami reports invalid or revoked token without crashing', async () => {
      saveStoredToken('invalid_token', configPath);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Error ejecutando tool \'get_my_setup\': Autenticación fallida: Token inválido',
              },
            ],
          },
        }),
      });

      const res = await handleWhoami({ configPath, fetchFn: mockFetch as unknown as typeof fetch });
      expect(res.success).toBe(false);
      expect(res.message).toContain('ya no es válido o ha sido revocado');
    });

    it('clearStoredToken returns false when config does not exist or has no token', () => {
      expect(clearStoredToken(configPath)).toBe(false);
      fs.writeFileSync(configPath, JSON.stringify({ registryUrl: 'http://localhost' }), 'utf8');
      expect(clearStoredToken(configPath)).toBe(false);
    });

    it('clearStoredToken removes token, preserves other config, and returns true', () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ token: 'test_pat_to_clear', registryUrl: 'http://localhost' }),
        'utf8'
      );
      expect(clearStoredToken(configPath)).toBe(true);
      expect(readStoredToken(configPath)).toBeNull();
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(raw.token).toBeUndefined();
      expect(raw.registryUrl).toBe('http://localhost');
    });

    it('logout clears stored token and subsequent whoami reports no active session', async () => {
      saveStoredToken('test_pat_to_logout', configPath);
      expect(readStoredToken(configPath)).toBe('test_pat_to_logout');

      const logoutRes = await handleLogout({ configPath });
      expect(logoutRes.success).toBe(true);
      expect(logoutRes.message).toContain('Sesión cerrada correctamente');
      expect(readStoredToken(configPath)).toBeNull();

      const whoamiRes = await handleWhoami({ configPath });
      expect(whoamiRes.success).toBe(false);
      expect(whoamiRes.message).toContain('No hay sesión activa');
    });

    it('logout without prior active session informs clearly that there was none', async () => {
      const res = await handleLogout({ configPath });
      expect(res.success).toBe(true);
      expect(res.message).toContain('No había ninguna sesión activa');
    });
  });

  describe('2.2 List and Search', () => {
    it('without session, list only fetches public skills and sends no auth header', async () => {
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
                  text: JSON.stringify([
                    {
                      id: 's1',
                      slug: 'public-skill',
                      name: 'Public Skill',
                      owner: 'Aybar-Corp',
                      isPublic: true,
                      isPaused: false,
                      latestVersion: { version: '1.0.0' },
                      description: 'Una skill pública',
                    },
                  ]),
                },
              ],
            },
          }),
        };
      });

      const res = await handleListOrSearch({
        configPath,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(res.data?.length).toBe(1);
      expect(res.message).toContain('Aybar-Corp/public-skill');
      expect(capturedHeaders['Authorization']).toBeUndefined();
    });

    it('with session, list passes Bearer token to include own private/paused skills', async () => {
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
                  text: JSON.stringify([
                    {
                      id: 's1',
                      slug: 'public-skill',
                      name: 'Public Skill',
                      owner: 'Aybar-Corp',
                      isPublic: true,
                      isPaused: false,
                      latestVersion: { version: '1.0.0' },
                      description: 'Una skill pública',
                    },
                    {
                      id: 's2',
                      slug: 'private-skill',
                      name: 'Private Skill',
                      owner: user1.username,
                      isPublic: false,
                      isPaused: false,
                      latestVersion: { version: '0.1.0' },
                      description: 'Mi skill privada',
                    },
                  ]),
                },
              ],
            },
          }),
        };
      });

      const res = await handleListOrSearch({
        configPath,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(res.data?.length).toBe(2);
      expect(res.message).toContain('[Privada]');
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${tokenUser1}`);
    });

    it('search passes query parameter and formats results', async () => {
      let capturedBody: { params: { name: string; arguments: { query: string } } } | undefined;

      const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedBody = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify([
                    {
                      id: 's3',
                      slug: 'react-helper',
                      name: 'React Helper',
                      owner: 'Aybar-Corp',
                      isPublic: true,
                      isPaused: false,
                      latestVersion: { version: '1.0.0' },
                      description: 'Helper for React',
                    },
                  ]),
                },
              ],
            },
          }),
        };
      });

      const res = await handleListOrSearch({
        query: 'react',
        configPath,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(capturedBody).toBeDefined();
      expect(capturedBody?.params.name).toBe('search_skills');
      expect(capturedBody?.params.arguments.query).toBe('react');
      expect(res.message).toContain('React Helper');
    });
  });

  describe('2.3 Pull command', () => {
    it('pulls public skill and writes all files to default target directory with subdirectories', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: 's-pub',
                  slug: 'manual-desarrollo',
                  owner: 'Aybar-Corp',
                  latestVersion: {
                    version: '1.0.0',
                    files: {
                      'SKILL.md': '# Manual de Desarrollo\nContenido',
                      'references/guia.md': '# Guía interna\nPasos',
                      'templates/base.json': '{"key": "value"}',
                    },
                  },
                }),
              },
            ],
          },
        }),
      });

      const projectDir = path.join(tempDir, 'my-project');
      fs.mkdirSync(projectDir, { recursive: true });

      const res = await handlePull('Aybar-Corp/manual-desarrollo', {
        configPath,
        targetBaseDir: projectDir,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(res.data?.filesWritten).toEqual([
        'SKILL.md',
        'references/guia.md',
        'templates/base.json',
      ]);

      const expectedSkillMd = path.join(projectDir, '.claude', 'skills', 'manual-desarrollo', 'SKILL.md');
      const expectedGuiaMd = path.join(projectDir, '.claude', 'skills', 'manual-desarrollo', 'references', 'guia.md');
      const expectedBaseJson = path.join(projectDir, '.claude', 'skills', 'manual-desarrollo', 'templates', 'base.json');

      expect(fs.existsSync(expectedSkillMd)).toBe(true);
      expect(fs.readFileSync(expectedSkillMd, 'utf8')).toBe('# Manual de Desarrollo\nContenido');
      expect(fs.existsSync(expectedGuiaMd)).toBe(true);
      expect(fs.readFileSync(expectedGuiaMd, 'utf8')).toBe('# Guía interna\nPasos');
      expect(fs.existsSync(expectedBaseJson)).toBe(true);
      expect(fs.readFileSync(expectedBaseJson, 'utf8')).toBe('{"key": "value"}');
    });

    it('pulls to custom directory when --dir option is provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: 's-pub',
                  slug: 'custom-dir-skill',
                  owner: 'Aybar-Corp',
                  latestVersion: {
                    version: '2.0.0',
                    files: {
                      'SKILL.md': '# Custom Dir Test',
                    },
                  },
                }),
              },
            ],
          },
        }),
      });

      const projectDir = path.join(tempDir, 'my-project');
      const customDir = '.cursor/skills/custom-dir-skill';

      const res = await handlePull('Aybar-Corp/custom-dir-skill', {
        dir: customDir,
        configPath,
        targetBaseDir: projectDir,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      const targetFile = path.join(projectDir, customDir, 'SKILL.md');
      expect(fs.existsSync(targetFile)).toBe(true);
      expect(fs.readFileSync(targetFile, 'utf8')).toBe('# Custom Dir Test');
    });

    it('rejects pulling another user\'s private/paused skill with clear error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Error ejecutando tool \'get_skill\': Skill \'other_user/secret-skill\' no encontrada.',
              },
            ],
          },
        }),
      });

      const res = await handlePull('other_user/secret-skill', {
        configPath,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('no existe o no está disponible');
    });

    it('pulls own private/paused skill successfully when authenticated', async () => {
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
                  text: JSON.stringify({
                    id: 's-priv',
                    slug: 'my-private-skill',
                    owner: user1.username,
                    isPublic: false,
                    isPaused: true,
                    latestVersion: {
                      version: '1.2.0',
                      files: {
                        'SKILL.md': '# Private Skill\nAuth required',
                      },
                    },
                  }),
                },
              ],
            },
          }),
        };
      });

      const projectDir = path.join(tempDir, 'my-private-project');
      const res = await handlePull(`${user1.username}/my-private-skill`, {
        configPath,
        targetBaseDir: projectDir,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${tokenUser1}`);
      const filePath = path.join(projectDir, '.claude', 'skills', 'my-private-skill', 'SKILL.md');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe('# Private Skill\nAuth required');
    });

    it('rejects invalid skill format', async () => {
      const res = await handlePull('invalid-format-without-slash', { configPath });
      expect(res.success).toBe(false);
      expect(res.message).toContain('Formato inválido');
    });
  });

  describe('2.4 Pull-Group command', () => {
    it('pulls all skills of a group to target directories and informs individual results', async () => {
      saveStoredToken(tokenUser1, configPath);
      const projectDir = path.join(tempDir, 'my-group-project');
      fs.mkdirSync(projectDir, { recursive: true });

      const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(init?.body as string);
        const toolName = body.params.name;
        const toolArgs = body.params.arguments;

        if (toolName === 'get_group') {
          return {
            ok: true,
            json: async () => ({
              jsonrpc: '2.0',
              id: 1,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      id: 'g1',
                      name: 'mi-stack',
                      ownerId: user1.id,
                      skillsCount: 2,
                      skills: [
                        {
                          id: 's1',
                          slug: 'skill-alpha',
                          name: 'Skill Alpha',
                          owner: 'Aybar-Corp',
                          latestVersion: {
                            version: '1.0.0',
                            files: {
                              'SKILL.md': '# Alpha Content',
                            },
                          },
                        },
                        {
                          id: 's2',
                          slug: 'skill-beta',
                          name: 'Skill Beta',
                          owner: 'Aybar-Corp',
                          latestVersion: {
                            version: '2.0.0',
                            files: {
                              'SKILL.md': '# Beta Content',
                            },
                          },
                        },
                      ],
                    }),
                  },
                ],
              },
            }),
          };
        }

        if (toolName === 'get_skill') {
          const slug = toolArgs.slug;
          return {
            ok: true,
            json: async () => ({
              jsonrpc: '2.0',
              id: 1,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      id: `id-${slug}`,
                      slug,
                      owner: toolArgs.owner,
                      latestVersion: {
                        version: slug === 'skill-alpha' ? '1.0.0' : '2.0.0',
                        files: {
                          'SKILL.md': `# ${slug} Content`,
                        },
                      },
                    }),
                  },
                ],
              },
            }),
          };
        }

        return { ok: false, status: 400 };
      });

      const res = await handlePullGroup('mi-stack', {
        configPath,
        targetBaseDir: projectDir,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(true);
      expect(res.data?.pulledSkills).toEqual(['Aybar-Corp/skill-alpha', 'Aybar-Corp/skill-beta']);
      expect(res.data?.failedSkills).toEqual([]);
      expect(res.message).toContain('Aybar-Corp/skill-alpha: descargada');
      expect(res.message).toContain('Aybar-Corp/skill-beta: descargada');
      expect(res.message).toContain('2/2 skills descargadas con éxito');

      const alphaFile = path.join(projectDir, '.claude', 'skills', 'skill-alpha', 'SKILL.md');
      const betaFile = path.join(projectDir, '.claude', 'skills', 'skill-beta', 'SKILL.md');
      expect(fs.existsSync(alphaFile)).toBe(true);
      expect(fs.readFileSync(alphaFile, 'utf8')).toBe('# skill-alpha Content');
      expect(fs.existsSync(betaFile)).toBe(true);
      expect(fs.readFileSync(betaFile, 'utf8')).toBe('# skill-beta Content');
    });

    it('handles non-existent or unowned group with clear error and without pulling files', async () => {
      saveStoredToken(tokenUser1, configPath);
      const projectDir = path.join(tempDir, 'empty-target');
      fs.mkdirSync(projectDir, { recursive: true });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: "Error ejecutando tool 'get_group': Grupo 'grupo-ajeno' no encontrado.",
              },
            ],
          },
        }),
      });

      const res = await handlePullGroup('grupo-ajeno', {
        configPath,
        targetBaseDir: projectDir,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('no existe o no está disponible');
      expect(fs.readdirSync(projectDir)).toHaveLength(0);
    });

    it('continues downloading remaining skills when one skill in group fails', async () => {
      saveStoredToken(tokenUser1, configPath);
      const projectDir = path.join(tempDir, 'partial-project');
      fs.mkdirSync(projectDir, { recursive: true });

      const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(init?.body as string);
        const toolName = body.params.name;
        const toolArgs = body.params.arguments;

        if (toolName === 'get_group') {
          return {
            ok: true,
            json: async () => ({
              jsonrpc: '2.0',
              id: 1,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      id: 'g-part',
                      name: 'stack-mixto',
                      ownerId: user1.id,
                      skillsCount: 2,
                      skills: [
                        {
                          id: 's-good',
                          slug: 'skill-ok',
                          owner: 'Aybar-Corp',
                          latestVersion: { version: '1.0.0', files: { 'SKILL.md': 'OK' } },
                        },
                        {
                          id: 's-bad',
                          slug: 'skill-broken',
                          owner: 'Aybar-Corp',
                          latestVersion: { version: '1.0.0', files: {} },
                        },
                      ],
                    }),
                  },
                ],
              },
            }),
          };
        }

        if (toolName === 'get_skill') {
          if (toolArgs.slug === 'skill-ok') {
            return {
              ok: true,
              json: async () => ({
                jsonrpc: '2.0',
                id: 1,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        id: 's-ok',
                        slug: 'skill-ok',
                        owner: 'Aybar-Corp',
                        latestVersion: { version: '1.0.0', files: { 'SKILL.md': '# Good' } },
                      }),
                    },
                  ],
                },
              }),
            };
          } else {
            return {
              ok: true,
              json: async () => ({
                jsonrpc: '2.0',
                id: 1,
                result: {
                  isError: true,
                  content: [{ type: 'text', text: "Error ejecutando tool 'get_skill': Skill 'Aybar-Corp/skill-broken' no encontrada." }],
                },
              }),
            };
          }
        }

        return { ok: false, status: 400 };
      });

      const res = await handlePullGroup('stack-mixto', {
        configPath,
        targetBaseDir: projectDir,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.success).toBe(false);
      expect(res.data?.pulledSkills).toEqual(['Aybar-Corp/skill-ok']);
      expect(res.data?.failedSkills).toEqual(['Aybar-Corp/skill-broken']);
      expect(res.message).toContain('Aybar-Corp/skill-ok: descargada');
      expect(res.message).toContain('Aybar-Corp/skill-broken:');
      expect(res.message).toContain('1/2 skills descargadas con éxito');

      const okFile = path.join(projectDir, '.claude', 'skills', 'skill-ok', 'SKILL.md');
      expect(fs.existsSync(okFile)).toBe(true);
    });

    it('fails when groupName is not provided', async () => {
      const res = await handlePullGroup('', { configPath });
      expect(res.success).toBe(false);
      expect(res.message).toContain('Debe especificar el nombre del grupo');
    });
  });

  describe('CLI main() entrypoint', () => {
    it('executes help command with cloudcode usage and logout listed', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await main(['--help']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('cloudcode <comando>'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('logout'));
      logSpy.mockRestore();
    });

    it('executes version command', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await main(['--version']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('skills-cli'));
      logSpy.mockRestore();
    });

    it('executes login via main()', async () => {
      process.env.SKILLS_CONFIG_PATH = configPath;
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await main(['login', '--token', 'test_main_tok']);
      expect(code).toBe(0);
      expect(readStoredToken(configPath)).toBe('test_main_tok');
      logSpy.mockRestore();
      delete process.env.SKILLS_CONFIG_PATH;
    });

    it('executes logout via main() when session exists', async () => {
      process.env.SKILLS_CONFIG_PATH = configPath;
      saveStoredToken('test_main_logout_tok', configPath);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await main(['logout']);
      expect(code).toBe(0);
      expect(readStoredToken(configPath)).toBeNull();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Sesión cerrada correctamente'));
      logSpy.mockRestore();
      delete process.env.SKILLS_CONFIG_PATH;
    });

    it('executes logout via main() when no session exists', async () => {
      process.env.SKILLS_CONFIG_PATH = configPath;
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await main(['logout']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No había ninguna sesión activa'));
      logSpy.mockRestore();
      delete process.env.SKILLS_CONFIG_PATH;
    });

    it('executes pull-group via main()', async () => {
      process.env.SKILLS_CONFIG_PATH = configPath;
      saveStoredToken(tokenUser1, configPath);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock handlePullGroup
      const pullGroupSpy = vi.spyOn(commands, 'handlePullGroup').mockResolvedValue({
        success: true,
        message: 'Resumen: 1/1 skills descargadas',
      });

      const code = await main(['pull-group', 'my-stack']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('Resumen: 1/1 skills descargadas');

      pullGroupSpy.mockRestore();
      logSpy.mockRestore();
      delete process.env.SKILLS_CONFIG_PATH;
    });

    it('executes unknown command and exits with code 1', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await main(['unknown-cmd']);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Comando desconocido'));
      errSpy.mockRestore();
      logSpy.mockRestore();
    });
  });
});
