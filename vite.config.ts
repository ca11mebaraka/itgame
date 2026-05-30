/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// base должен совпадать с именем репозитория для GitHub Pages: https://<user>.github.io/itgame/
export default defineConfig({
  base: '/itgame/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
