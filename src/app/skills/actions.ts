'use server';

import { incrementDownloadsCount, incrementInstallsCount } from '@/lib/catalog/counters';
import { revalidatePath } from 'next/cache';

export async function incrementDownloadAction(owner: string, slug: string) {
  const result = await incrementDownloadsCount(owner, slug);
  if (!result) {
    return { success: false, error: 'Skill no encontrada o archivada' };
  }
  revalidatePath(`/skills/${owner}/${slug}`);
  revalidatePath('/');
  return { success: true, downloadsCount: result.downloadsCount };
}

export async function incrementInstallAction(owner: string, slug: string) {
  const result = await incrementInstallsCount(owner, slug);
  if (!result) {
    return { success: false, error: 'Skill no encontrada o archivada' };
  }
  revalidatePath(`/skills/${owner}/${slug}`);
  revalidatePath('/');
  return { success: true, installsCount: result.installsCount };
}
