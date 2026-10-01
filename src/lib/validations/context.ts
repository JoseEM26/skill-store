import { z } from 'zod';

export const createIdeaSchema = z.object({
  title: z.string().trim().min(1, 'El título es requerido').max(150, 'Máximo 150 caracteres'),
  body: z.string().trim().optional().default(''),
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
  isPublic: z.boolean().optional().default(false),
});

export const updateIdeaSchema = z.object({
  id: z.string().min(1, 'El ID es requerido'),
  title: z.string().trim().min(1, 'El título es requerido').max(150, 'Máximo 150 caracteres'),
  body: z.string().trim().optional().default(''),
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
  isPublic: z.boolean().optional().default(false),
});

export const createExternalReferenceSchema = z.object({
  title: z.string().trim().min(1, 'El título es requerido').max(150, 'Máximo 150 caracteres'),
  body: z.string().trim().optional().default(''),
  link: z.string().trim().url('El enlace debe ser una URL válida (ej. https://...)'),
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
  isPublic: z.literal(true).default(true),
});

export const updateExternalReferenceSchema = z.object({
  id: z.string().min(1, 'El ID es requerido'),
  title: z.string().trim().min(1, 'El título es requerido').max(150, 'Máximo 150 caracteres'),
  body: z.string().trim().optional().default(''),
  link: z.string().trim().url('El enlace debe ser una URL válida (ej. https://...)'),
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
  isPublic: z.literal(true).default(true),
});

export type CreateIdeaInput = z.input<typeof createIdeaSchema>;
export type UpdateIdeaInput = z.input<typeof updateIdeaSchema>;
export type CreateExternalReferenceInput = z.input<typeof createExternalReferenceSchema>;
export type UpdateExternalReferenceInput = z.input<typeof updateExternalReferenceSchema>;
