import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts')
        },
        output: {
          format: 'es',
          entryFileNames: '[name].mjs'
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts'),
          worker: resolve('src/preload/worker.ts')
        }
      }
    }
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          settings: resolve('src/renderer/settings/index.html'),
          history: resolve('src/renderer/history/index.html'),
          overlay: resolve('src/renderer/overlay/index.html'),
          worker: resolve('src/renderer/worker/index.html')
        }
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
