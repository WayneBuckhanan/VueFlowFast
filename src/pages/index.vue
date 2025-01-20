<!--
  This is the default "layout" for any routes nested from files within the @/src/pages/index directory.
  You can do similar for any `name/` directory with a `name.vue` file that includes a `RouterView` component.
  See [File based routing | Unplugin Vue Router](https://uvr.esm.is/guide/file-based-routing.html#nested-routes) for more info.
-->
<template lang="pug">
VaLayout(:left="{ absolute: breakpoints.smDown }").h-screen
  template(#top)
    VaNavbar(color="primary").py-2
      template(#left)
        VaButton(@click="showSidebar = !showSidebar" :icon="showSidebar ? 'menu_open' : 'menu'")
      template(#center)
        VaNavbarItem.font-bold.text-lg
          | {{ title }}
  template(#left)
    VaSidebar(v-model="showSidebar")
      SidebarContents
  template(#content)
    main
      RouterView
</template>

<script setup>
import { useBreakpoint } from "vuestic-ui"
const showSidebar = ref(false)
const breakpoints = useBreakpoint()

const route = useRoute()
const title = route?.meta?.['title'] || 'Default Header Text'
</script>
