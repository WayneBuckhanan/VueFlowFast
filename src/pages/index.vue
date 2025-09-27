<!--
  This is the default "layout" for any routes nested from files within the @/src/pages/index directory.
  You can do similar for any `name/` directory with a `name.vue` file that includes a `RouterView` component.
  See [File based routing | Unplugin Vue Router](https://uvr.esm.is/guide/file-based-routing.html#nested-routes) for more info.
-->
<template lang="pug">
.flex.flex-col.min-h-screen(class="bg-slate-100 dark:bg-slate-700")
  ToolBar
    //template(#start)
    template(#center)
      .text-lg.font-bold {{ title }}
    //template(#end)
      Button(
        label="Login"
        severity="secondary"
        variant="outlined"
        size="small"
      )
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
          .iconify.mdi--chevron-double-left.w-5.h-5(v-if="showSidebar")
          .iconify.mdi--chevron-double-right.w-5.h-5(v-else)
        // Sidebar Contents
        ScrollPanel(
          v-show="showSidebar"
          class="bg-slate-200 dark:bg-slate-800 transition-all duration-300 ease-in-out"
        )
          #sidebar.flex.flex-col.gap-2
            SidebarContents
    // Main Contents
    .flex.w-full
      main.w-full.p-6
        RouterView
//Toast
//ConfirmDialog
</template>

<script setup>
const showSidebar = ref(true)

const route = useRoute()
const title = route?.meta?.title
</script>
