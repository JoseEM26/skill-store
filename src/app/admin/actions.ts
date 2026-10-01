'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import {
  createIdeaSchema,
  updateIdeaSchema,
  createExternalReferenceSchema,
  updateExternalReferenceSchema,
} from '@/lib/validations/context';
import { createSkillSchema, updateSkillSchema } from '@/lib/validations/skill';
import {
  createIdea,
  updateIdea,
  createExternalReference,
  updateExternalReference,
  deleteUserContext,
  AuthorizationError,
} from '@/lib/admin/contexts';
import {
  createUserSkill,
  updateUserSkill,
  deleteUserSkill,
  ConflictError,
} from '@/lib/admin/skills';
import { createAccessTokenSchema } from '@/lib/validations/token';
import { createAccessToken, revokeAccessToken } from '@/lib/auth/tokens';
import type { AccessToken } from '@prisma/client';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthorizationError('Debes iniciar sesión para realizar esta acción');
  }
  return session.user.id;
}

// --- IDEAS ---

export async function createIdeaAction(input: unknown): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const validated = createIdeaSchema.parse(input);
    const idea = await createIdea(ownerId, validated);
    revalidatePath('/admin/contexts');
    return { success: true, data: idea };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al crear la idea',
    };
  }
}

export async function updateIdeaAction(input: unknown): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const validated = updateIdeaSchema.parse(input);
    const idea = await updateIdea(ownerId, validated);
    revalidatePath('/admin/contexts');
    return { success: true, data: idea };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al actualizar la idea',
    };
  }
}

// --- EXTERNAL REFERENCES ---

export async function createExternalReferenceAction(input: unknown): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const validated = createExternalReferenceSchema.parse(input);
    const ref = await createExternalReference(ownerId, validated);
    revalidatePath('/admin/contexts');
    return { success: true, data: ref };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al crear la referencia',
    };
  }
}

export async function updateExternalReferenceAction(input: unknown): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const validated = updateExternalReferenceSchema.parse(input);
    const ref = await updateExternalReference(ownerId, validated);
    revalidatePath('/admin/contexts');
    return { success: true, data: ref };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al actualizar la referencia',
    };
  }
}

// --- CONTEXT DELETION ---

export async function deleteContextAction(id: string): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    await deleteUserContext(id, ownerId);
    revalidatePath('/admin/contexts');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar el contexto',
    };
  }
}

// --- SKILLS ---

export async function createSkillAction(input: unknown): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const validated = createSkillSchema.parse(input);
    const skill = await createUserSkill(ownerId, validated);
    revalidatePath('/admin/skills');
    return { success: true, data: skill };
  } catch (error) {
    if (error instanceof ConflictError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar la skill',
    };
  }
}

export async function updateSkillAction(input: unknown): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const validated = updateSkillSchema.parse(input);
    const skill = await updateUserSkill(ownerId, validated);
    revalidatePath('/admin/skills');
    return { success: true, data: skill };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar la skill',
    };
  }
}

export async function deleteSkillAction(id: string): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    await deleteUserSkill(id, ownerId);
    revalidatePath('/admin/skills');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar la skill',
    };
  }
}

// --- ACCESS TOKENS ---

export async function createAccessTokenAction(
  input: unknown
): Promise<ActionResult<{ accessToken: AccessToken; rawToken: string }>> {
  try {
    const ownerId = await requireAuth();
    const validated = createAccessTokenSchema.parse(input);
    const result = await createAccessToken(ownerId, validated);
    revalidatePath('/admin/tokens');
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear el token de acceso',
    };
  }
}

export async function revokeAccessTokenAction(id: string): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    await revokeAccessToken(id, ownerId);
    revalidatePath('/admin/tokens');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al revocar el token de acceso',
    };
  }
}

