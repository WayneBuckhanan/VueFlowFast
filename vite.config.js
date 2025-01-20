import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
// Baseline Helpers
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    AutoImport({ imports: [
      'vue', 'pinia', //'vue-router', // presets from github.com/unjs/unimport used by unplugin-auto-import
      VueRouterAutoImports, // swap 'vue-router' for VueRouterAutoImports from unplugin-vue-router
      //{ '@/store/auth.js': ['useAuthStore']}, // Pinia auth store
    ]}),
    Components(),
    VueRouter({
      routeBlockLang: 'yaml',
      //routesFolder: 'src/views',
      /* config options w/defaults */
      //routesFolder: 'src/pages',
      //extensions: ['.vue'],
      //exclude: [],
      //dts: './typed-router.d.ts',
      //getRouteName: (routeNode) => myOwnGenerateRouteName(routeNode),
      //routeBlockLang: 'json5',
      //importMode: 'async',
    }),
    // ⚠️  VueRouter() must be placed before Vue
    Vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 650,
  },
  //base: "/subdir/",
})
