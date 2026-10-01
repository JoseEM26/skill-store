import { z } from 'zod';

export const tokenScopeSchema = z.enum(['read', 'write', 'delete']);
export type TokenScope = z.infer<typeof tokenScopeSchema>;

export const createAccessTokenSchema = z.object({
  label: z.string().trim().min(1, 'La etiqueta es requerida').max(100, 'Máximo 100 caracteres'),
  scopes: z
    .array(tokenScopeSchema)
    .min(1, 'Debes seleccionar al menos un scope (read, write, delete)'),
  expiresAt: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }),
});

export type CreateAccessTokenInput = z.input<typeof createAccessTokenSchema>;
export type CreateAccessTokenOutput = z.output<typeof createAccessTokenSchema>;
