<!--
  This is the default "layout" for any routes nested from files within the @/src/pages/index directory.
  You can do similar for any `name/` directory with a `name.vue` file that includes a `RouterView` component.
  See [File based routing | Unplugin Vue Router](https://uvr.esm.is/guide/file-based-routing.html#nested-routes) for more info.
-->
<template lang="pug">
<div class="mb-2 mx-3 flex-1 place-self-end float-right" />
.flex.flex-col.justify-stretch(class="h-[100vh] bg-slate-100 dark:bg-slate-700")
  ToolBar
    //template(#start)
    template(#center)
      .text-lg.font-bold {{ title }}
    //template(#end)
      Button(variant="outlined") Login
  .flex.flex-row.flex-1.w-full
    Panel(
      toggleable
      unstyled
      pt="{pcToggleButton: {rounded: true, variant: 'outlined', class: 'float-right'}}"
      class="bg-slate-200 dark:bg-slate-800"
    ).flex.flex-col.flex-0.w-fit.h-full
      template(#toggleicon="{collapsed}")
        i.m-3.mb-2(:class="collapsed ? 'pi pi-angle-double-right' : 'pi pi-angle-double-left'")
      ScrollPanel.w-fit
        SidebarContents
    ScrollPanel.flex.flex-1.w-full.h-full
      main.w-full
        RouterView
</template>

<script setup>
const showSidebar = ref(true)

const route = useRoute()
const title = route?.meta?.['title'] || 'Default Header Text'
</script>
