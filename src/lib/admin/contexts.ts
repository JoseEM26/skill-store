import { prisma } from '@/lib/prisma';
import type { Context } from '@prisma/client';
import {
  createIdeaSchema,
  updateIdeaSchema,
  createExternalReferenceSchema,
  updateExternalReferenceSchema,
  type CreateIdeaInput,
  type UpdateIdeaInput,
  type CreateExternalReferenceInput,
  type UpdateExternalReferenceInput,
} from '@/lib/validations/context';

export class AuthorizationError extends Error {
  constructor(message = 'No tienes permiso para acceder o modificar este recurso') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export async function getUserContexts(
  ownerId: string,
  filter?: { type?: 'idea' | 'external_reference' }
): Promise<Context[]> {
  return await prisma.context.findMany({
    where: {
      ownerId,
      isArchived: false,
      ...(filter?.type ? { type: filter.type } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUserContextById(id: string, ownerId: string): Promise<Context | null> {
  const context = await prisma.context.findFirst({
    where: {
      id,
      ownerId,
    },
  });
  return context;
}

export async function createIdea(ownerId: string, input: CreateIdeaInput): Promise<Context> {
  const data = createIdeaSchema.parse(input);
  return await prisma.context.create({
    data: {
      type: 'idea',
      title: data.title,
      body: data.body || null,
      tags: data.tags,
      isPublic: data.isPublic,
      ownerId,
    },
  });
}

export async function updateIdea(ownerId: string, input: UpdateIdeaInput): Promise<Context> {
  const data = updateIdeaSchema.parse(input);
  // Check ownership
  const existing = await prisma.context.findFirst({
    where: { id: data.id, ownerId, type: 'idea' },
  });

  if (!existing) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  if (existing.isArchived) {
    throw new AuthorizationError('No se pueden modificar recursos archivados');
  }

  return await prisma.context.update({
    where: { id: data.id },
    data: {
      title: data.title,
      body: data.body || null,
      tags: data.tags,
      isPublic: data.isPublic,
    },
  });
}

export async function createExternalReference(
  ownerId: string,
  input: CreateExternalReferenceInput
): Promise<Context> {
  const data = createExternalReferenceSchema.parse(input);
  return await prisma.context.create({
    data: {
      type: 'external_reference',
      title: data.title,
      body: data.body || null,
      link: data.link,
      tags: data.tags,
      isPublic: true,
      ownerId,
    },
  });
}

export async function updateExternalReference(
  ownerId: string,
  input: UpdateExternalReferenceInput
): Promise<Context> {
  const data = updateExternalReferenceSchema.parse(input);
  const existing = await prisma.context.findFirst({
    where: { id: data.id, ownerId, type: 'external_reference' },
  });

  if (!existing) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  if (existing.isArchived) {
    throw new AuthorizationError('No se pueden modificar recursos archivados');
  }

  return await prisma.context.update({
    where: { id: data.id },
    data: {
      title: data.title,
      body: data.body || null,
      link: data.link,
      tags: data.tags,
      isPublic: true,
    },
  });
}

export async function deleteUserContext(id: string, ownerId: string): Promise<Context> {
  const existing = await prisma.context.findFirst({
    where: { id, ownerId },
  });

  if (!existing) {
    throw new AuthorizationError('Recurso no encontrado o no pertenece a tu usuario');
  }

  if (existing.isArchived) {
    throw new AuthorizationError('No se pueden eliminar recursos archivados');
  }

  return await prisma.context.delete({
    where: { id },
  });
}
