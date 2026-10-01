import { defineConfig } from 'vitest/config';
import path from 'path';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/skill_store?schema=public';
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'dummy-auth-secret-for-local-testing-32-chars-long-min';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
});
