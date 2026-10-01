import { z } from 'zod';

export const createSkillSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'El slug es requerido')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-z0-9-_]+$/, 'El slug solo puede contener letras minúsculas, números, guiones y guiones bajos'),
  name: z.string().trim().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  description: z.string().trim().optional().default(''),
  license: z.string().trim().optional().default('MIT'),
  repositoryUrl: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().url('Debe ser una URL válida (ej. https://github.com/...)').optional()),
});

export const updateSkillSchema = z.object({
  id: z.string().min(1, 'El ID es requerido'),
  name: z.string().trim().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  description: z.string().trim().optional().default(''),
  license: z.string().trim().optional().default('MIT'),
  repositoryUrl: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().url('Debe ser una URL válida (ej. https://github.com/...)').optional()),
});

export type CreateSkillInput = z.input<typeof createSkillSchema>;
export type UpdateSkillInput = z.input<typeof updateSkillSchema>;
