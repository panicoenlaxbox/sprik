import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'main',
          include: ['src/main/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['src/test/setup.main.ts'],
          globals: true
        }
      },
      {
        test: {
          name: 'renderer',
          include: ['src/renderer/**/*.test.{ts,tsx}'],
          environment: 'happy-dom',
          setupFiles: ['src/test/setup.renderer.ts'],
          globals: true
        }
      }
    ],
    coverage: {
      provider: 'v8',
      include: ['src/main/**/*.ts'],
      exclude: ['src/main/index.ts', 'src/**/*.test.ts'],
      thresholds: {
        lines: 80,
        branches: 70
      },
      reporter: ['text', 'lcov']
    }
  }
})
