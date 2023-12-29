import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)

import { createRouter, createWebHistory } from 'vue-router/auto'
import { routes } from 'vue-router/auto-routes'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
app.use(router)

import { createPinia } from 'pinia'
app.use(createPinia())

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
const vuestic = createVuestic({
  config: {
    colors: colors,
    icons: createIconsConfig({ fonts }),
  }
})
app.use(vuestic)
// use these styles with Tailwind not `import 'vuestic-ui/css'`
import 'vuestic-ui/styles/essential.css'
import 'vuestic-ui/styles/typography.css'

import './index.css'
app.mount('#app')
