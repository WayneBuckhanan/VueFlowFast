<template lang="pug">
VaLayout(:left="{ absolute: breakpoints.smDown }").h-screen
  template(#top)
    VaNavbar(color="primary").py-2
      template(#left)
        VaButton(@click="showSidebar = !showSidebar" :icon="showSidebar ? 'menu_open' : 'menu'")
      template(#center)
        VaNavbarItem.font-bold.text-lg
          | Project Title
  template(#left)
    VaSidebar(v-model="showSidebar")
      SidebarContents
  template(#content)
    main
      RouterView
</template>

<script setup>
import { useBreakpoint } from "vuestic-ui"
const showSidebar = ref(true)
const breakpoints = useBreakpoint()
</script>
