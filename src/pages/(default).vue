<!--
  This is the default "layout" for any routes nested from files within the @/src/pages/(default)/ directory.
  You can do similar for any `name/` directory with a `name.vue` file that includes a `RouterView` component. Without parenthesis impact the route, with parens don't.
  See [File Conventions | Vue Router](https://router.vuejs.org/file-based-routing/file-based-routing.html) for more info.
-->

<template lang="pug">
UDashboardGroup(unit="px")
  UDashboardSidebar(
    collapsible
    resizable
    :min-size="180"
    :max-size="320"
    :default-size="240"
    :ui="{ footer: 'border-t border-default' }"
  )
    template(#header="{ collapsed }")
      span.text-sm.font-semibold.text-highlighted.truncate(v-if="!collapsed") {{ title }}
      UIcon.mx-auto.size-5.text-primary(v-else name="i-lucide-layout-dashboard")
    SidebarContents

  UDashboardPanel
    template(#header)
      UDashboardNavbar(:title="title")
        template(#leading)
          UDashboardSidebarCollapse
        template(#right)
          UButton(label="Login" color="neutral" variant="outline" size="sm")
    template(#body)
      main.w-full.p-6
        RouterView
</template>

<script setup lang="ts">
const route = useRoute()
const title = computed(() => (route.meta?.title as string | undefined) ?? 'VueFlowFast')
</script>
