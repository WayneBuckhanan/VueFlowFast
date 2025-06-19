<!--
  This is the default "layout" for any routes nested from files within the @/src/pages/index directory.
  You can do similar for any `name/` directory with a `name.vue` file that includes a `RouterView` component.
  See [File based routing | Unplugin Vue Router](https://uvr.esm.is/guide/file-based-routing.html#nested-routes) for more info.
-->
<template lang="pug">
<div class="mb-2 mx-3 flex-1 place-self-end float-right" />
.flex.flex-col.min-h-screen(class="bg-slate-100 dark:bg-slate-700")
  ToolBar
    //template(#start)
    template(#center)
      .text-lg.font-bold {{ title }}
    //template(#end)
      Button(variant="outlined") Login

  .flex.flex-row.flex-grow.w-full
    // Sidebar Container
    .flex.flex-col.w-fit.p-2(
      class="bg-slate-200 dark:bg-slate-800 transition-all duration-300 ease-in-out"
    )
      .flex.flex-col.gap-2.sticky.top-2
        // Sidebar Toggle Button
        Button.place-self-end(
          @click="showSidebar = !showSidebar"
          variant="outlined"
          severity="secondary"
          :pt="{root: {class: 'p-1 !rounded-full'}}"
        )
          i.pi.pi-angle-double-left(v-if="showSidebar")
          i.pi.pi-angle-double-right(v-else)
        // Sidebar Contents
        ScrollPanel(
          v-show="showSidebar"
          class="bg-slate-200 dark:bg-slate-800 transition-all duration-300 ease-in-out"
        )
          SidebarContents

    // Main Contents
    ScrollPanel.flex.w-full
      main.w-full
        RouterView
</template>

<script setup>
const showSidebar = ref(true)

const route = useRoute()
const title = route?.meta?.['title'] || 'Default Header Text'
</script>
