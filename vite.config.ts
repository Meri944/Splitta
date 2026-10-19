import { defineConfig } from 'vitest/config';

// GitHub Pages serverar appen under /<repo-namn>/
export default defineConfig({
  base: '/Splitta/',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
