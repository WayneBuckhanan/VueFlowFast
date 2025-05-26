const DEFAULT_PAGE_TITLE = 'Default App Title'
// Base Vue config
import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)

// Vue Router with unplugin-vue-router config
import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
if(import.meta.hot) {
  handleHotUpdate(router)
}
router.beforeEach((to)=> {
  document.title = to?.meta?.title ? to.meta.title : DEFAULT_PAGE_TITLE
})
app.use(router)

// PrimeVue UI toolkit
import PrimeVue from 'primevue/config'
//import Theme from '@primeuix/themes/aura'
import Theme from '@primeuix/themes/lara'
//import Theme from '@primeuix/themes/nora'
//import Theme from '@primeuix/themes/material'
app.use(PrimeVue, {
  theme: {
    preset: Theme,
    options: {
      //darkModeSelector: '.my-app-dark',
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue, components, utilities'
      }
    }
  }
}) 

// Pinia browser store
import { createPinia } from 'pinia'
const pinia = createPinia()
//import { PiniaSharedState } from 'pinia-shared-state'
//pinia.use( PiniaSharedState )
import PiniaPluginPersistedstate from 'pinia-plugin-persistedstate'
pinia.use(PiniaPluginPersistedstate)
app.use(pinia)

// Our app styles applied after all other packages above
import './index.css'
app.mount('#app')
