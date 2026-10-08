import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAccessToken } from '@/lib/auth/tokens';

describe('MCP Route Handler (/api/mcp)', () => {
  let user: { id: string; githubId: string; username: string };
  let rawToken: string;

  beforeEach(async () => {
    user = await prisma.user.create({
      data: {
        githubId: `test-mcp-route-${Date.now()}`,
        username: `mcp_route_${Date.now()}`,
      },
    });

    const tok = await createAccessToken(user.id, {
      label: 'Route Token',
      scopes: ['read'],
    });
    rawToken = tok.rawToken;
  });

  afterEach(async () => {
    if (user?.id) {
      await prisma.accessToken.deleteMany({ where: { ownerId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });

  it('GET /api/mcp returns protocol metadata and tools list', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.name).toBe('cloudcode-skills-registry');
    expect(json.tools.length).toBeGreaterThanOrEqual(8);
    expect(json.tools.map((t: { name: string }) => t.name)).toContain('list_skills');
    expect(json.tools.map((t: { name: string }) => t.name)).toContain('get_my_setup');
  });

  it('POST /api/mcp responds to JSON-RPC initialize', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.id).toBe(1);
    expect(json.result.serverInfo.name).toBe('cloudcode-skills-registry');
  });

  it('POST /api/mcp responds to JSON-RPC tools/list', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(json.result.tools.length).toBeGreaterThanOrEqual(8);
  });

  it('POST /api/mcp executes tools/call for list_skills', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'list_skills',
          arguments: { limit: 10 },
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(json.result.content[0].type).toBe('text');
    const parsed = JSON.parse(json.result.content[0].text);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('POST /api/mcp executes get_my_setup with Authorization Bearer header', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${rawToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'get_my_setup',
          arguments: {},
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(json.result.isError).toBeUndefined();
    const parsed = JSON.parse(json.result.content[0].text);
    expect(parsed.user.id).toBe(user.id);
  });

  it('POST /api/mcp executes write tools (create_context, delete_context, publish_skill)', async () => {
    const writeTok = await createAccessToken(user.id, {
      label: 'Write Token',
      scopes: ['read', 'write'],
    });

    const delTok = await createAccessToken(user.id, {
      label: 'Delete Token',
      scopes: ['read', 'write', 'delete'],
    });

    // 1. create_context via JSON-RPC
    const reqCreate = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${writeTok.rawToken}` },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'create_context',
          arguments: {
            type: 'idea',
            title: 'Idea via Route',
            body: 'Contenido JSON-RPC',
          },
        },
      }),
    });
    const resCreate = await POST(reqCreate);
    const jsonCreate = await resCreate.json();
    expect(jsonCreate.result.isError).toBeUndefined();
    const createdContext = JSON.parse(jsonCreate.result.content[0].text);
    expect(createdContext.id).toBeDefined();
    expect(createdContext.title).toBe('Idea via Route');

    // 2. delete_context rejected with write token (no delete scope)
    const reqDelForbidden = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${writeTok.rawToken}` },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'delete_context',
          arguments: {
            id: createdContext.id,
          },
        },
      }),
    });
    const resDelForbidden = await POST(reqDelForbidden);
    const jsonDelForbidden = await resDelForbidden.json();
    expect(jsonDelForbidden.result.isError).toBe(true);
    expect(jsonDelForbidden.result.content[0].text).toContain('permiso requerido \'delete\'');

    // 3. delete_context succeeds with delete token
    const reqDelSuccess = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${delTok.rawToken}` },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'delete_context',
          arguments: {
            id: createdContext.id,
          },
        },
      }),
    });
    const resDelSuccess = await POST(reqDelSuccess);
    const jsonDelSuccess = await resDelSuccess.json();
    expect(jsonDelSuccess.result.isError).toBeUndefined();
    const deletedRes = JSON.parse(jsonDelSuccess.result.content[0].text);
    expect(deletedRes.success).toBe(true);
  });

  it('POST /api/mcp executes tools/call for install_skill without authentication', async () => {
    const testSkill = await prisma.skill.create({
      data: {
        slug: 'jsonrpc-install-skill',
        name: 'JSONRPC Install Skill',
        ownerId: user.id,
        downloadsCount: 0,
        installsCount: 0,
        isArchived: false,
      },
    });

    const req = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'install_skill',
          arguments: {
            owner: user.username,
            slug: testSkill.slug,
          },
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(json.result.isError).toBeUndefined();
    const parsed = JSON.parse(json.result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.installsCount).toBe(1);

    // Verify in DB
    const inDb = await prisma.skill.findUnique({ where: { id: testSkill.id } });
    expect(inDb?.installsCount).toBe(1);
  });

  it('responds with HTTP 429 Too Many Requests when IP rate limit is exceeded', async () => {
    const rateLimitedIp = '10.99.88.77';

    // Insert hits up to default limit
    const hits = Array.from({ length: 60 }).map(() => ({
      ip: rateLimitedIp,
      endpoint: 'mcp_endpoint',
    }));
    await prisma.rateLimitHit.createMany({ data: hits });

    const req = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        'x-forwarded-for': rateLimitedIp,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 10,
        method: 'ping',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe('Too Many Requests');

    // Cleanup
    await prisma.rateLimitHit.deleteMany({
      where: { ip: rateLimitedIp },
    });
  });

  it('POST /api/mcp executes get_skill and get_version returning files', async () => {
    const skill = await prisma.skill.create({
      data: {
        slug: 'jsonrpc-files-skill',
        name: 'JSONRPC Files Skill',
        ownerId: user.id,
        isPublic: true,
        isPaused: false,
        versions: {
          create: {
            version: '1.0.0',
            changelog: 'Initial version with files',
            files: { 'SKILL.md': '# Hello', 'config.json': '{"a": 1}' },
          },
        },
      },
    });

    // 1. get_skill
    const reqSkill = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'get_skill',
          arguments: { owner: user.username, slug: skill.slug },
        },
      }),
    });
    const resSkill = await POST(reqSkill);
    const jsonSkill = await resSkill.json();
    expect(jsonSkill.result.isError).toBeUndefined();
    const parsedSkill = JSON.parse(jsonSkill.result.content[0].text);
    expect(parsedSkill.latestVersion.files).toEqual({ 'SKILL.md': '# Hello', 'config.json': '{"a": 1}' });

    // 2. get_version
    const reqVersion = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'get_version',
          arguments: { owner: user.username, slug: skill.slug, version: '1.0.0' },
        },
      }),
    });
    const resVersion = await POST(reqVersion);
    const jsonVersion = await resVersion.json();
    expect(jsonVersion.result.isError).toBeUndefined();
    const parsedVersion = JSON.parse(jsonVersion.result.content[0].text);
    expect(parsedVersion.files).toEqual({ 'SKILL.md': '# Hello', 'config.json': '{"a": 1}' });
  });

  it('POST /api/mcp executes list_groups and get_group with Bearer token', async () => {
    const skill = await prisma.skill.create({
      data: {
        slug: 'group-skill-1',
        name: 'Group Skill 1',
        ownerId: user.id,
        isPublic: true,
        isPaused: false,
        versions: {
          create: {
            version: '1.0.0',
            files: { 'SKILL.md': '# Group Skill 1' },
          },
        },
      },
    });

    const group = await prisma.skillGroup.create({
      data: {
        name: 'my-rpc-group',
        ownerId: user.id,
        items: {
          create: [{ skillId: skill.id }],
        },
      },
    });

    // 1. list_groups
    const reqList = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rawToken}` },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'list_groups',
          arguments: {},
        },
      }),
    });
    const resList = await POST(reqList);
    const jsonList = await resList.json();
    expect(jsonList.result.isError).toBeUndefined();
    const parsedList = JSON.parse(jsonList.result.content[0].text);
    expect(parsedList).toHaveLength(1);
    expect(parsedList[0].name).toBe('my-rpc-group');
    expect(parsedList[0].skillsCount).toBe(1);

    // 2. get_group
    const reqGet = new NextRequest('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rawToken}` },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'get_group',
          arguments: { name: 'my-rpc-group' },
        },
      }),
    });
    const resGet = await POST(reqGet);
    const jsonGet = await resGet.json();
    expect(jsonGet.result.isError).toBeUndefined();
    const parsedGet = JSON.parse(jsonGet.result.content[0].text);
    expect(parsedGet.id).toBe(group.id);
    expect(parsedGet.skills).toHaveLength(1);
    expect(parsedGet.skills[0].slug).toBe('group-skill-1');
    expect(parsedGet.skills[0].latestVersion.files).toEqual({ 'SKILL.md': '# Group Skill 1' });
  });
});

