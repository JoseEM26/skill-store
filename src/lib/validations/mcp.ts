import { z } from 'zod';

export const createContextMcpBaseSchema = z.object({
  token: z.string().optional(),
  type: z.enum(['idea', 'external_reference']),
  title: z.string().trim().min(1, 'El título es requerido').max(150, 'Máximo 150 caracteres'),
  body: z.string().trim().optional().default(''),
  link: z.string().trim().url('El enlace debe ser una URL válida (ej. https://...)').optional(),
  tags: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => {
      if (Array.isArray(val)) return val.map((t) => t.trim()).filter(Boolean);
      return val
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    })
    .default([]),
  isPublic: z.boolean().optional(),
});

export const createContextMcpSchema = createContextMcpBaseSchema.refine(
  (data) => {
    if (data.type === 'external_reference') {
      return !!data.link && data.link.length > 0;
    }
    return true;
  },
  {
    message: 'El enlace (link) es obligatorio y debe ser una URL válida para referencias externas',
    path: ['link'],
  }
);

export const updateContextMcpSchema = z.object({
  token: z.string().optional(),
  id: z.string().trim().min(1, 'El ID de contexto es requerido'),
  title: z.string().trim().min(1, 'El título es requerido').max(150, 'Máximo 150 caracteres').optional(),
  body: z.string().trim().optional(),
  link: z.string().trim().url('El enlace debe ser una URL válida (ej. https://...)').optional(),
  tags: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => {
      if (Array.isArray(val)) return val.map((t) => t.trim()).filter(Boolean);
      return val
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    })
    .optional(),
  isPublic: z.boolean().optional(),
});

export const deleteContextMcpSchema = z.object({
  token: z.string().optional(),
  id: z.string().trim().min(1, 'El ID de contexto es requerido'),
});

export const publishSkillMcpSchema = z.object({
  token: z.string().optional(),
  id: z.string().trim().optional(),
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
  isPublic: z.boolean().optional(),
  isPaused: z.boolean().optional(),
});

export const deleteSkillMcpBaseSchema = z.object({
  token: z.string().optional(),
  id: z.string().trim().optional(),
  slug: z.string().trim().optional(),
});

export const deleteSkillMcpSchema = deleteSkillMcpBaseSchema.refine(
  (data) => Boolean(data.id || data.slug),
  {
    message: 'Se requiere id o slug de la skill a eliminar',
  }
);

export type CreateContextMcpInput = z.input<typeof createContextMcpSchema>;
export type UpdateContextMcpInput = z.input<typeof updateContextMcpSchema>;
export type DeleteContextMcpInput = z.input<typeof deleteContextMcpSchema>;
export type PublishSkillMcpInput = z.input<typeof publishSkillMcpSchema>;
export type DeleteSkillMcpInput = z.input<typeof deleteSkillMcpSchema>;
