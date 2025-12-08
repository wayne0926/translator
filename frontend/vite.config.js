import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'icons/*.png'],
      manifest: {
        name: 'AI Translator',
        short_name: 'Translator',
        description: 'A simple translator app using AI models.',
        theme_color: '#4285f4',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    outDir: '../dist', // Output to 'dist' folder one level up
    emptyOutDir: true, // Clear the output directory on build
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Your Express server
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // Rewrite is often not needed if target matches
      },
    },
  },
})
