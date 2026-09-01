import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

const API_TARGET = process.env.VITE_API_URL || 'http://localhost:4000/'

export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    quasar()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/assets/styles/_variables.scss";'
      }
    }
  },
  server: {
    port: 9000,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true
      },
      '/documents': {
        target: API_TARGET,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../public-v2',
    emptyOutDir: true
  }
})
