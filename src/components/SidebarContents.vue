<template lang="pug">
UNavigationMenu(:items="menuItems" orientation="vertical" class="w-full")
</template>

<script setup>
const menuItems = [
  { label: 'Home', icon: 'i-mdi-home', to: '/' },
  { label: 'Help', icon: 'i-mdi-help-circle', to: '/help' },
  { label: 'CRUDL as User', icon: 'i-mdi-user', to: '/demo/crudl' },
  { label: 'CRUDL as Admin', icon: 'i-mdi-user-lock', to: '/demo/admin' },
  { label: 'User Management', icon: 'i-mdi-user-edit', to: '/demo/users' },
]
</script>
