import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createIdea,
  updateIdea,
  createExternalReference,
  updateExternalReference,
  deleteUserContext,
  getUserContexts,
  getUserContextById,
  AuthorizationError,
} from '../contexts';

describe('Admin Contexts Service (Ownership & Isolation)', () => {
  let userA: { id: string; githubId: string };
  let userB: { id: string; githubId: string };

  beforeEach(async () => {
    // Create test users
    userA = await prisma.user.create({
      data: {
        githubId: `test-admin-user-a-${Date.now()}`,
        username: 'userA',
      },
    });

    userB = await prisma.user.create({
      data: {
        githubId: `test-admin-user-b-${Date.now()}`,
        username: 'userB',
      },
    });
  });

  afterEach(async () => {
    // Clean up created contexts and users
    if (userA?.id) {
      await prisma.context.deleteMany({ where: { ownerId: userA.id } });
      await prisma.user.deleteMany({ where: { id: userA.id } });
    }
    if (userB?.id) {
      await prisma.context.deleteMany({ where: { ownerId: userB.id } });
      await prisma.user.deleteMany({ where: { id: userB.id } });
    }
  });

  it('creates an idea with isPublic = false by default', async () => {
    const idea = await createIdea(userA.id, {
      title: 'Nota de arquitectura',
      body: 'Detalle privado',
      tags: ['arch', 'ai'],
    });

    expect(idea.id).toBeDefined();
    expect(idea.ownerId).toBe(userA.id);
    expect(idea.isPublic).toBe(false);
    expect(idea.type).toBe('idea');
  });

  it('creates an external reference enforcing isPublic = true', async () => {
    const ref = await createExternalReference(userA.id, {
      title: 'Superpowers Library',
      link: 'https://github.com/superpowers',
      tags: ['library'],
      isPublic: true,
    });

    expect(ref.id).toBeDefined();
    expect(ref.ownerId).toBe(userA.id);
    expect(ref.isPublic).toBe(true);
    expect(ref.type).toBe('external_reference');
    expect(ref.link).toBe('https://github.com/superpowers');

    const updated = await updateExternalReference(userA.id, {
      id: ref.id,
      title: 'Superpowers Library V2',
      link: 'https://github.com/superpowers/v2',
      isPublic: true,
    });
    expect(updated.title).toBe('Superpowers Library V2');
  });

  it('retrieves only contexts belonging to the specified owner', async () => {
    await createIdea(userA.id, { title: 'Idea User A' });
    await createIdea(userB.id, { title: 'Idea User B' });

    const contextsA = await getUserContexts(userA.id);
    expect(contextsA.length).toBe(1);
    expect(contextsA[0].title).toBe('Idea User A');

    const contextsB = await getUserContexts(userB.id);
    expect(contextsB.length).toBe(1);
    expect(contextsB[0].title).toBe('Idea User B');
  });

  it('prevents user A from updating a context owned by user B', async () => {
    const ideaB = await createIdea(userB.id, { title: 'Idea privada de B' });

    await expect(
      updateIdea(userA.id, {
        id: ideaB.id,
        title: 'Intento de hackeo por A',
      })
    ).rejects.toThrow(AuthorizationError);

    const unchanged = await getUserContextById(ideaB.id, userB.id);
    expect(unchanged?.title).toBe('Idea privada de B');
  });

  it('prevents user A from deleting a context owned by user B', async () => {
    const ideaB = await createIdea(userB.id, { title: 'Idea privada de B' });

    await expect(deleteUserContext(ideaB.id, userA.id)).rejects.toThrow(AuthorizationError);

    const stillExists = await getUserContextById(ideaB.id, userB.id);
    expect(stillExists).not.toBeNull();
  });

  it('rejects update and delete operations on archived contexts with AuthorizationError', async () => {
    const archivedIdea = await prisma.context.create({
      data: {
        type: 'idea',
        title: 'Archived Idea',
        ownerId: userA.id,
        isArchived: true,
        isPublic: true,
      },
    });

    await expect(
      updateIdea(userA.id, {
        id: archivedIdea.id,
        title: 'Should Fail',
      })
    ).rejects.toThrow(AuthorizationError);

    await expect(
      deleteUserContext(archivedIdea.id, userA.id)
    ).rejects.toThrow(AuthorizationError);

    const archivedRef = await prisma.context.create({
      data: {
        type: 'external_reference',
        title: 'Archived Ref',
        link: 'https://example.com/archived',
        ownerId: userA.id,
        isArchived: true,
        isPublic: true,
      },
    });

    await expect(
      updateExternalReference(userA.id, {
        id: archivedRef.id,
        title: 'Should Fail Ref',
        link: 'https://example.com/archived-v2',
      })
    ).rejects.toThrow(AuthorizationError);
  });
});
