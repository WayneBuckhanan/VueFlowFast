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

// Vuestic UI config
import { createVuestic } from 'vuestic-ui'
const breakpoint = {
  thresholds: {
    // Vuestic UI default breakpoints, includes 'xs' selector for < 640px
    // 'sm':  640, 'md':    1024, 'lg':    1440, 'xl':    1920,
    // Tailwind CSS default breakpoints
    // 'sm':  640, 'md':     768, 'lg':    1024, 'xl':    1280, '2xl':   1536,
    // updated variation on https://www.freecodecamp.org/news/the-100-correct-way-to-do-css-breakpoints-88d6a5ba1862/
    'sm':     700, 'md':    1400, 'lg':    2100,                'xl':    3500, '2xl':   7000,
    '720p':   700, '1080p': 1400, '1440p': 2100, '2k':    2100, '4k':    3500, '8k':    7000,
  },
}
const colors = {
  currentPresetName: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light',
  variables: { primary: '#005c78', },
}
const vuestic = createVuestic({
  config: {
    breakpoint,
    colors,
  }
})
app.use(vuestic)
// use these styles with Tailwind not `import 'vuestic-ui/css'`
import 'vuestic-ui/styles/essential.css'
import 'vuestic-ui/styles/typography.css'

// Our app styles applied after all other packages above
import './index.css'
app.mount('#app')
