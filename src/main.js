const DEFAULT_PAGE_TITLE = 'Default App Title'
// Base Vue config
import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)

// Vue Router with unplugin-vue-router config
import { createRouter, createWebHistory } from 'vue-router/auto'
import { setupLayouts } from 'virtual:generated-layouts'
import { routes } from 'vue-router/auto-routes'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
})
router.beforeEach((to)=> {
  document.title = to?.meta?.title ? to.meta.title : DEFAULT_PAGE_TITLE
})
app.use(router)

// Vuestic UI config
import { createVuestic, createIconsConfig } from 'vuestic-ui'
const colors = {
  currentPresetName: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light',
  variables: { primary: '#005c78', },
}
const fonts = [{
  name: 'mdi-{icon}',
  resolve: ({ icon }) => ({
    //class: 'mdi', //class: 'material-design-icons',
    content: icon,
    tag: 'span',
  }),
}]
const breakpoint = {
  thresholds: {
    'sm':     700, //640,
    'md':    1400, //768,
    'lg':    2100, //1024,
    'xl':    3500, //1280,
    '2xl':   7000, //1536,
    '720p':   700,
    '1080p': 1400,
    '1440p': 2100,
    '2k':    2100,
    '4k':    3500,
    '8k':    7000,
  },
}
const vuestic = createVuestic({
  config: {
    breakpoint,
    colors,
    icons: createIconsConfig({ fonts }),
  }
})
app.use(vuestic)
// use these styles with Tailwind not `import 'vuestic-ui/css'`
import 'vuestic-ui/styles/essential.css'
import 'vuestic-ui/styles/typography.css'

// Our app styles applied after all other packages above
import './index.css'
app.mount('#app')
