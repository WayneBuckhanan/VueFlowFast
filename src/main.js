const DEFAULT_PAGE_TITLE = 'Default App Title'
// Base Vue config
import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)
// Can't collapse the App.vue file here with the UApp wrapper since Nuxt UI can't manage the auto import this way for some reason
//const app = createApp({ template: '<UApp><RouterView/></UApp>' }) // collapse to here since App.vue had one line

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

// Nuxt UI
import ui from '@nuxt/ui/vue-plugin'
app.use(ui)

// Our app styles applied after all other packages above
import './index.css'
app.mount('#app')
