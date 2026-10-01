import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  GITHUB_ID: z.string().optional().default('dummy-github-id'),
  GITHUB_SECRET: z.string().optional().default('dummy-github-secret'),
  AUTH_SECRET: z.string().optional().default('dummy-auth-secret-for-local-testing-32-chars-long-min'),
  AUTH_SESSION_MAX_AGE: z.coerce.number().positive().default(2592000),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env?: Record<string, string | undefined>): Env {
  const targetEnv = env !== undefined ? env : process.env;
  const result = envSchema.safeParse(targetEnv);
  if (!result.success) {
    throw new Error(`Invalid environment variables: ${JSON.stringify(result.error.format())}`);
  }
  return result.data;
}
