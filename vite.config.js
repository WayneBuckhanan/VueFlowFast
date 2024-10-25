import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
// Baseline Helpers
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Layouts from 'vite-plugin-vue-layouts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    AutoImport({ imports: [
      'vue', 'pinia', //'vue-router', // presets from github.com/unjs/unimport used by unplugin-auto-import
      VueRouterAutoImports, // swap 'vue-router' for VueRouterAutoImports from unplugin-vue-router
      //{ '@/store/auth.js': ['useAuthStore']}, // Pinia auth store
    ]}),
    Icons({ scale: 1.5, defaultStyle: 'vertical-align:middle;', autoInstall: true, }),
    Components({
      resolvers: [ IconsResolver({prefix:'icon',}), ],
    }),
    Layouts({
      //pagesDir: 'src/views', // default 'src/pages',
      //defaultLayout: 'default', // default 'default', // no .vue extension
      //layoutsDirs: 'src/layouts', // default 'src/layouts',
      //exclude: '', // default ??
    }),
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
