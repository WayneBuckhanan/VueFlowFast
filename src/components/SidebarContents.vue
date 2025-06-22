<template lang="pug">
Menu(:model="menuItems").mx-2
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const menuItems = computed(() => {
  const baseItems = [
    { label: 'Home', icon: 'pi pi-home', url: '/' },
  ]

  if (authStore.isAuthenticated) {
    // Authenticated user menu items
    return [
      ...baseItems,
      { separator: true },
      { label: 'Dashboard', icon: 'pi pi-chart-line', url: '/dashboard' },
      { label: 'My Items', icon: 'pi pi-list', url: '/my-items' },
      { label: 'Settings', icon: 'pi pi-cog', url: '/settings' },
      { separator: true },
      { label: 'Help', icon: 'pi pi-question', url: '/help' },
    ]
  } else {
    // Public menu items
    return [
      ...baseItems,
      { label: 'About', icon: 'pi pi-info-circle', url: '/about' },
      { label: 'Help', icon: 'pi pi-question', url: '/help' },
    ]
  }
})
</script>
