import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
// Baseline Helpers
import VueRouter from 'vue-router/vite'
import NuxtUI from '@nuxt/ui/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VueRouter({
      routeBlockLang: 'yaml',
      //routesFolder: 'src/views', // override the 'src/pages' default if you need compatibility with older/other file structures
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
    // Nuxt UI ships its own Tailwind CSS v4 Vite plugin, and bundles both
    // unplugin-vue-components (for `U*` components) and unplugin-auto-import
    // (for the 'vue'/'vue-router' presets + its own composables like useToast).
    // Registering separate instances of either plugin throws, so we configure
    // Nuxt UI's own instance instead of adding our own.
    NuxtUI({
      components: { // config for embedded unplugin-vue-components
        //e.g. dirs: ['src/components'],
      },
      autoImport: { // config for embedded unplugin-auto-import
        imports: [
          'vue', 'vue-router', //'pinia' // presets from github.com/unjs/unimport used by unplugin-auto-import
          //{ '@/store/auth.js': ['useAuthStore']}, // Pinia auth store
        ]
      },
      prose: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      //vue: 'vue/dist/vue.esm-bundler.js', // to allow the main.js to absorb the nearly empty App.vue file
    }
  },
  server: {
    port: 5173,
    open: true,
    allowedHosts: ['.local'],
  },
  build: {
    chunkSizeWarningLimit: 650,
  },
  //base: "/subdir/",
})
