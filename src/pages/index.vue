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
    template(#end)
      .flex.items-center.gap-2
        template(v-if="authStore.isAuthenticated")
          .text-sm.text-gray-600 Welcome, {{ authStore.user?.email }}
          Button(
            variant="outlined"
            size="small"
            :loading="authStore.isLoading"
            @click="handleLogout"
          ) Logout
        template(v-else)
          Button(
            variant="outlined"
            size="small"
            @click="showAuthModal = true"
          ) Login
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

  // Auth Modal
  AuthModal(
    v-model:visible="showAuthModal"
    @authenticated="handleAuthenticated"
    @cancelled="handleAuthCancelled"
    @error="handleAuthError"
  )

  // Toast for notifications
  Toast
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'primevue/usetoast'
import AuthModal from '../components/auth/AuthModal.vue'
import Toast from 'primevue/toast'

const showSidebar = ref(true)
const showAuthModal = ref(false)

const route = useRoute()
const title = route?.meta?.['title'] || 'Default Header Text'

// Auth store
const authStore = useAuthStore()
const toast = useToast()

// Auth handlers
const handleAuthenticated = (user) => {
  toast.add({
    severity: 'success',
    summary: 'Welcome!',
    detail: `Successfully logged in as ${user.email}`,
    life: 3000
  })
}

const handleAuthCancelled = () => {
  // Optional: show a message or perform cleanup
}

const handleAuthError = (error) => {
  toast.add({
    severity: 'error',
    summary: 'Authentication Error',
    detail: error,
    life: 5000
  })
}

const handleLogout = async () => {
  try {
    const result = await authStore.logout()
    if (result.success) {
      toast.add({
        severity: 'info',
        summary: 'Logged Out',
        detail: 'You have been successfully logged out',
        life: 3000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Logout Error',
      detail: 'Failed to logout properly',
      life: 5000
    })
  }
}
</script>
