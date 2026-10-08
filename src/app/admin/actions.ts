'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import {
  createIdeaSchema,
  updateIdeaSchema,
  createExternalReferenceSchema,
  updateExternalReferenceSchema,
} from '@/lib/validations/context';
import {
  createSkillSchema,
  updateSkillSchema,
  updateSkillContentSchema,
  createSkillContentSchema,
} from '@/lib/validations/skill';
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
  createUserSkillContent,
  updateUserSkill,
  updateUserSkillContent,
  deleteUserSkill,
  ConflictError,
} from '@/lib/admin/skills';
import {
  createUserGroup,
  renameUserGroup,
  deleteUserGroup,
  addSkillToGroup,
  removeSkillFromGroup,
} from '@/lib/admin/groups';
import { createAccessTokenSchema } from '@/lib/validations/token';
import { createAccessToken, revokeAccessToken } from '@/lib/auth/tokens';
import { deleteAccountService } from '@/lib/auth/account';
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

export async function updateSkillContentAction(input: unknown): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const validated = updateSkillContentSchema.parse(input);
    const skill = await updateUserSkillContent(
      ownerId,
      validated.id,
      validated.content,
      validated.isPublic !== undefined ? { isPublic: validated.isPublic } : undefined
    );
    revalidatePath('/admin/skills');
    revalidatePath('/skills');
    revalidatePath('/');
    return { success: true, data: skill };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar el contenido de la skill',
    };
  }
}

export async function createSkillContentAction(input: unknown): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const validated = createSkillContentSchema.parse(input);
    const skill = await createUserSkillContent(
      ownerId,
      validated.content,
      validated.isPublic !== undefined ? { isPublic: validated.isPublic } : undefined
    );
    revalidatePath('/admin/skills');
    revalidatePath('/skills');
    revalidatePath('/');
    return { success: true, data: skill };
  } catch (error) {
    if (error instanceof ConflictError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar la skill por contenido',
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

// --- ACCOUNT DELETION ---

export async function deleteAccountAction(): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    await deleteAccountService(ownerId);
    revalidatePath('/admin');
    revalidatePath('/skills');
    revalidatePath('/contexts');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar la cuenta',
    };
  }
}

// --- SKILL GROUPS ---

export async function createGroupAction(input: unknown): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const name = typeof input === 'string' ? input : (input as { name?: string })?.name;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return { success: false, error: 'El nombre del grupo es requerido' };
    }
    const group = await createUserGroup(ownerId, name);
    revalidatePath('/admin/groups');
    return { success: true, data: group };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear el grupo',
    };
  }
}

export async function renameGroupAction(
  groupIdOrInput: string | { groupId: string; name: string },
  newName?: string
): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const groupId = typeof groupIdOrInput === 'string' ? groupIdOrInput : groupIdOrInput?.groupId;
    const name = typeof groupIdOrInput === 'string' ? newName : groupIdOrInput?.name;
    if (!groupId || typeof groupId !== 'string') {
      return { success: false, error: 'El ID del grupo es requerido' };
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return { success: false, error: 'El nombre del grupo es requerido' };
    }
    const group = await renameUserGroup(ownerId, groupId, name);
    revalidatePath('/admin/groups');
    return { success: true, data: group };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al renombrar el grupo',
    };
  }
}

export async function deleteGroupAction(groupId: string): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    if (!groupId || typeof groupId !== 'string') {
      return { success: false, error: 'El ID del grupo es requerido' };
    }
    await deleteUserGroup(ownerId, groupId);
    revalidatePath('/admin/groups');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar el grupo',
    };
  }
}

export async function addSkillToGroupAction(
  groupIdOrInput: string | { groupId: string; skillId: string },
  skillIdParam?: string
): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const groupId = typeof groupIdOrInput === 'string' ? groupIdOrInput : groupIdOrInput?.groupId;
    const skillId = typeof groupIdOrInput === 'string' ? skillIdParam : groupIdOrInput?.skillId;
    if (!groupId || !skillId) {
      return { success: false, error: 'groupId y skillId son requeridos' };
    }
    const item = await addSkillToGroup(ownerId, groupId, skillId);
    revalidatePath('/admin/groups');
    return { success: true, data: item };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al agregar la skill al grupo',
    };
  }
}

export async function removeSkillFromGroupAction(
  groupIdOrInput: string | { groupId: string; skillId: string },
  skillIdParam?: string
): Promise<ActionResult> {
  try {
    const ownerId = await requireAuth();
    const groupId = typeof groupIdOrInput === 'string' ? groupIdOrInput : groupIdOrInput?.groupId;
    const skillId = typeof groupIdOrInput === 'string' ? skillIdParam : groupIdOrInput?.skillId;
    if (!groupId || !skillId) {
      return { success: false, error: 'groupId y skillId son requeridos' };
    }
    await removeSkillFromGroup(ownerId, groupId, skillId);
    revalidatePath('/admin/groups');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al quitar la skill del grupo',
    };
  }
}


