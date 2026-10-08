import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createIdeaAction,
  updateIdeaAction,
  createExternalReferenceAction,
  deleteContextAction,
  createSkillAction,
  createSkillContentAction,
  updateSkillAction,
  updateSkillContentAction,
  deleteSkillAction,
  createAccessTokenAction,
  revokeAccessTokenAction,
  deleteAccountAction,
  createGroupAction,
  renameGroupAction,
  deleteGroupAction,
  addSkillToGroupAction,
  removeSkillFromGroupAction,
} from '../actions';
import { hashToken } from '@/lib/auth/tokens';
import type { Session } from 'next-auth';

const mockAuth = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

describe('Admin Server Actions (Security & Authorization)', () => {
  let userA: { id: string; githubId: string };
  let userB: { id: string; githubId: string };

  beforeEach(async () => {
    vi.clearAllMocks();

    userA = await prisma.user.create({
      data: {
        githubId: `test-act-user-a-${Date.now()}`,
        username: 'userA_actions',
      },
    });

    userB = await prisma.user.create({
      data: {
        githubId: `test-act-user-b-${Date.now()}`,
        username: 'userB_actions',
      },
    });
  });

  afterEach(async () => {
    if (userA?.id) {
      await prisma.skillGroup.deleteMany({ where: { ownerId: userA.id } });
      await prisma.accessToken.deleteMany({ where: { ownerId: userA.id } });
      await prisma.context.deleteMany({ where: { ownerId: userA.id } });
      await prisma.skill.deleteMany({ where: { ownerId: userA.id } });
      await prisma.user.deleteMany({ where: { id: userA.id } });
    }
    if (userB?.id) {
      await prisma.skillGroup.deleteMany({ where: { ownerId: userB.id } });
      await prisma.accessToken.deleteMany({ where: { ownerId: userB.id } });
      await prisma.context.deleteMany({ where: { ownerId: userB.id } });
      await prisma.skill.deleteMany({ where: { ownerId: userB.id } });
      await prisma.user.deleteMany({ where: { id: userB.id } });
    }
  });

  it('rejects all actions when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const resIdea = await createIdeaAction({ title: 'Test Idea' });
    expect(resIdea.success).toBe(false);
    expect(resIdea.error).toContain('Debes iniciar sesión');

    const resSkill = await createSkillAction({ slug: 'test-skill', name: 'Test' });
    expect(resSkill.success).toBe(false);
    expect(resSkill.error).toContain('Debes iniciar sesión');
  });

  it('creates idea with isPublic = false when authenticated as user A', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const res = await createIdeaAction({
      title: 'Idea de A',
      body: 'Detalle de la idea',
      tags: 'ai, agents',
    });

    expect(res.success).toBe(true);
    const idea = res.data as { id: string; isPublic: boolean; ownerId: string };
    expect(idea.isPublic).toBe(false);
    expect(idea.ownerId).toBe(userA.id);
  });

  it('creates external reference with isPublic = true when authenticated as user A', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const res = await createExternalReferenceAction({
      title: 'Herdr Tool',
      link: 'https://github.com/herdr/herdr',
      tags: ['tool'],
      isPublic: true,
    });

    expect(res.success).toBe(true);
    const ref = res.data as { id: string; isPublic: boolean; ownerId: string; link: string };
    expect(ref.isPublic).toBe(true);
    expect(ref.ownerId).toBe(userA.id);
    expect(ref.link).toBe('https://github.com/herdr/herdr');
  });

  it('creates and updates skill for user A', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const createRes = await createSkillAction({
      slug: 'skill-alpha',
      name: 'Skill Alpha',
      description: 'Alpha version',
    });

    expect(createRes.success).toBe(true);
    const skill = createRes.data as { id: string; name: string };

    const updateRes = await updateSkillAction({
      id: skill.id,
      name: 'Skill Alpha Renamed',
      isPublic: false,
      isPaused: true,
    });

    expect(updateRes.success).toBe(true);
    const updatedSkill = updateRes.data as { isPublic: boolean; isPaused: boolean };
    expect(updatedSkill.isPublic).toBe(false);
    expect(updatedSkill.isPaused).toBe(true);
  });

  it('prevents user A from modifying or deleting contexts belonging to user B', async () => {
    // User B creates an idea
    const ideaB = await prisma.context.create({
      data: {
        type: 'idea',
        title: 'Idea Secreta B',
        ownerId: userB.id,
      },
    });

    // User A attempts to update user B's idea
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const updateRes = await updateIdeaAction({
      id: ideaB.id,
      title: 'Hackeado por A',
    });

    expect(updateRes.success).toBe(false);
    expect(updateRes.error).toContain('no pertenece a tu usuario');

    // User A attempts to delete user B's idea
    const deleteRes = await deleteContextAction(ideaB.id);
    expect(deleteRes.success).toBe(false);
    expect(deleteRes.error).toContain('no pertenece a tu usuario');

    // Verify idea B is intact
    const checkIdeaB = await prisma.context.findUnique({ where: { id: ideaB.id } });
    expect(checkIdeaB?.title).toBe('Idea Secreta B');
  });

  it('prevents user A from modifying or deleting skills belonging to user B', async () => {
    // User B creates a skill
    const skillB = await prisma.skill.create({
      data: {
        slug: 'skill-b',
        name: 'Skill de B',
        ownerId: userB.id,
      },
    });

    // User A attempts to update user B's skill
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const updateRes = await updateSkillAction({
      id: skillB.id,
      name: 'Intentado modificar por A',
    });

    expect(updateRes.success).toBe(false);
    expect(updateRes.error).toContain('no pertenece a tu usuario');

    // User A attempts to delete user B's skill
    const deleteRes = await deleteSkillAction(skillB.id);
    expect(deleteRes.success).toBe(false);
    expect(deleteRes.error).toContain('no pertenece a tu usuario');

    // Verify skill B is intact
    const checkSkillB = await prisma.skill.findUnique({ where: { id: skillB.id } });
    expect(checkSkillB?.name).toBe('Skill de B');
  });

  it('creates access token and returns rawToken for user A', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const res = await createAccessTokenAction({
      label: 'Token Test A',
      scopes: ['read', 'write'],
    });

    expect(res.success).toBe(true);
    expect(res.data?.rawToken.startsWith('ccs_')).toBe(true);
    expect(res.data?.accessToken.ownerId).toBe(userA.id);
    expect(res.data?.accessToken.label).toBe('Token Test A');
  });

  it('prevents user A from revoking access token belonging to user B', async () => {
    // User B creates a token directly
    const tokenB = await prisma.accessToken.create({
      data: {
        ownerId: userB.id,
        tokenHash: hashToken('ccs_userbtesttoken0000000000000000000000000000000000000000000000000000000'),
        label: 'Secret Token B',
        scopes: ['read'],
      },
    });

    // User A attempts to revoke user B's token
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const res = await revokeAccessTokenAction(tokenB.id);
    expect(res.success).toBe(false);
    expect(res.error).toContain('no pertenece a tu usuario');

    // Verify token B remains active
    const checkTokenB = await prisma.accessToken.findUnique({ where: { id: tokenB.id } });
    expect(checkTokenB?.revokedAt).toBeNull();
  });

  it('deletes account through Server Action for authenticated user', async () => {
    // Create resources for user A
    await prisma.skill.create({
      data: {
        slug: 'del-act-skill',
        name: 'Del Act Skill',
        ownerId: userA.id,
      },
    });

    await prisma.context.create({
      data: {
        type: 'idea',
        title: 'Secret idea to delete',
        ownerId: userA.id,
        isPublic: false,
      },
    });

    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const res = await deleteAccountAction();
    expect(res.success).toBe(true);

    const skillInDb = await prisma.skill.findFirst({ where: { slug: 'del-act-skill', ownerId: userA.id } });
    expect(skillInDb?.isArchived).toBe(true);

    const ideaInDb = await prisma.context.findFirst({ where: { title: 'Secret idea to delete', ownerId: userA.id } });
    expect(ideaInDb).toBeNull();
  });

  it('updates skill content through Server Action for authenticated owner', async () => {
    const skillA = await prisma.skill.create({
      data: {
        slug: 'action-skill-content',
        name: 'Initial Name',
        ownerId: userA.id,
      },
    });

    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const validMarkdown = `---
name: action-skill-content
description: Action updated description
license: MIT
compatibility: "Claude Code, OpenAI Codex, Cursor >= 0.40"
metadata:
  version: "1.0.0"
  author: "User A"
---

## 1. Propósito y Cuándo Usar
Propósito.

## 2. Flujo de Trabajo (Workflow)
Flujo.

## 3. Reglas y Restricciones (Criterios de Diseño)
Reglas.

## 4. Árbol de Decisión (Si aplica)
Árbol.

## 5. Ejemplos Ejecutables
Ejemplos.

## 6. Manejo de Errores y Casos Excepcionales
Errores.
`;

    const res = await updateSkillContentAction({
      id: skillA.id,
      content: validMarkdown,
    });

    expect(res.success).toBe(true);

    const updated = await prisma.skill.findUnique({
      where: { id: skillA.id },
      include: { versions: true },
    });
    expect(updated?.description).toBe('Action updated description');
    expect(updated?.versions).toHaveLength(1);
    expect(updated?.versions[0].version).toBe('1.0.0');
  });

  it('creates skill via createSkillContentAction for authenticated owner', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const validMarkdown = `---
name: action-created-skill
description: Created directly via content action
license: MIT
compatibility: "Claude Code"
metadata:
  version: "1.0.0"
  author: "User A"
---

## 1. Propósito y Cuándo Usar
Propósito.

## 2. Flujo de Trabajo (Workflow)
Workflow.

## 3. Reglas y Restricciones (Criterios de Diseño)
Reglas.

## 4. Árbol de Decisión (Si aplica)
No aplica.

## 5. Ejemplos Ejecutables
Ejemplos.

## 6. Manejo de Errores y Casos Excepcionales
Errores.
`;

    const res = await createSkillContentAction({
      content: validMarkdown,
    });

    expect(res.success).toBe(true);

    const created = await prisma.skill.findFirst({
      where: { slug: 'action-created-skill', ownerId: userA.id },
      include: { versions: true },
    });
    expect(created).not.toBeNull();
    expect(created?.name).toBe('action-created-skill');
    expect(created?.description).toBe('Created directly via content action');
    expect(created?.isPublic).toBe(true);
    expect(created?.versions).toHaveLength(1);
    expect(created?.versions[0].version).toBe('1.0.0');

    // Duplicate creation returns conflict error
    const duplicateRes = await createSkillContentAction({
      content: validMarkdown,
    });
    expect(duplicateRes.success).toBe(false);
    expect(duplicateRes.error).toContain('Ya tienes una skill registrada con el slug "action-created-skill"');
  });

  it('creates private skill via createSkillContentAction when isPublic is false', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const validMarkdown = `---
name: private-action-skill
description: Private skill via content action
license: MIT
compatibility: "Claude Code"
metadata:
  version: "1.0.0"
  author: "User A"
---

## 1. Propósito y Cuándo Usar
Propósito.

## 2. Flujo de Trabajo (Workflow)
Workflow.

## 3. Reglas y Restricciones (Criterios de Diseño)
Reglas.

## 4. Árbol de Decisión (Si aplica)
No aplica.

## 5. Ejemplos Ejecutables
Ejemplos.

## 6. Manejo de Errores y Casos Excepcionales
Errores.
`;

    const res = await createSkillContentAction({
      content: validMarkdown,
      isPublic: false,
    });

    expect(res.success).toBe(true);

    const created = await prisma.skill.findFirst({
      where: { slug: 'private-action-skill', ownerId: userA.id },
    });
    expect(created?.isPublic).toBe(false);
  });

  it('updates skill visibility via updateSkillContentAction', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const skill = await prisma.skill.create({
      data: {
        slug: 'update-vis-content-skill',
        name: 'Update Vis Skill',
        ownerId: userA.id,
        isPublic: true,
      },
    });

    const validMarkdown = `---
name: update-vis-content-skill
description: Updated vis
license: MIT
compatibility: "Claude Code"
metadata:
  version: "1.0.0"
  author: "User A"
---

## 1. Propósito y Cuándo Usar
Propósito.

## 2. Flujo de Trabajo (Workflow)
Workflow.

## 3. Reglas y Restricciones (Criterios de Diseño)
Reglas.

## 4. Árbol de Decisión (Si aplica)
No aplica.

## 5. Ejemplos Ejecutables
Ejemplos.

## 6. Manejo de Errores y Casos Excepcionales
Errores.
`;

    const res = await updateSkillContentAction({
      id: skill.id,
      content: validMarkdown,
      isPublic: false,
    });

    expect(res.success).toBe(true);
    const updated = await prisma.skill.findUnique({ where: { id: skill.id } });
    expect(updated?.isPublic).toBe(false);
  });

  it('prevents user A from updating skill content belonging to user B via Server Action', async () => {
    const skillB = await prisma.skill.create({
      data: {
        slug: 'skill-b-forbidden',
        name: 'Skill B',
        ownerId: userB.id,
      },
    });

    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const validMarkdown = `---
name: skill-b-forbidden
description: Attempted hack by user A
license: MIT
compatibility: "Claude Code"
metadata:
  version: "1.0.0"
  author: "User A"
---

## 1. Propósito y Cuándo Usar
...
## 2. Flujo de Trabajo (Workflow)
...
## 3. Reglas y Restricciones (Criterios de Diseño)
...
## 4. Árbol de Decisión (Si aplica)
...
## 5. Ejemplos Ejecutables
...
## 6. Manejo de Errores y Casos Excepcionales
...
`;

    const res = await updateSkillContentAction({
      id: skillB.id,
      content: validMarkdown,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('no pertenece a tu usuario');
  });

  it('performs CRUD and skill associations on skill groups for authenticated owner', async () => {
    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    // Create group
    const createRes = await createGroupAction({ name: 'Group Actions Test' });
    expect(createRes.success).toBe(true);
    const group = createRes.data as { id: string; name: string };
    expect(group.name).toBe('Group Actions Test');

    // Create own skill
    const skillA = await prisma.skill.create({
      data: {
        slug: 'skill-action-a',
        name: 'Skill A Action',
        ownerId: userA.id,
      },
    });

    // Add skill to group
    const addRes = await addSkillToGroupAction(group.id, skillA.id);
    expect(addRes.success).toBe(true);

    // Rename group
    const renameRes = await renameGroupAction(group.id, 'Group Actions Renamed');
    expect(renameRes.success).toBe(true);
    const renamed = renameRes.data as { name: string };
    expect(renamed.name).toBe('Group Actions Renamed');

    // Remove skill from group
    const removeRes = await removeSkillFromGroupAction(group.id, skillA.id);
    expect(removeRes.success).toBe(true);

    // Delete group
    const deleteRes = await deleteGroupAction(group.id);
    expect(deleteRes.success).toBe(true);
  });

  it('rejects adding a private skill owned by user B to a group owned by user A', async () => {
    const groupA = await prisma.skillGroup.create({
      data: {
        name: 'Group of A',
        ownerId: userA.id,
      },
    });

    const skillB = await prisma.skill.create({
      data: {
        slug: 'skill-b-for-group',
        name: 'Skill B',
        ownerId: userB.id,
        isPublic: false,
      },
    });

    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const addRes = await addSkillToGroupAction(groupA.id, skillB.id);
    expect(addRes.success).toBe(false);
    expect(addRes.error).toContain('no pertenece a tu usuario');
  });

  it('allows adding a public skill owned by user B to a group owned by user A', async () => {
    const groupA = await prisma.skillGroup.create({
      data: {
        name: 'Group of A Public',
        ownerId: userA.id,
      },
    });

    const publicSkillB = await prisma.skill.create({
      data: {
        slug: 'public-skill-b-for-group',
        name: 'Public Skill B',
        ownerId: userB.id,
        isPublic: true,
        isPaused: false,
      },
    });

    mockAuth.mockResolvedValue({
      user: { id: userA.id, name: 'User A' },
      expires: new Date().toISOString(),
    } as unknown as Session);

    const addRes = await addSkillToGroupAction(groupA.id, publicSkillB.id);
    expect(addRes.success).toBe(true);
  });
});
