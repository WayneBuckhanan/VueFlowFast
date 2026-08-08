<template lang="pug">
UNavigationMenu(:items="menuItems" orientation="vertical" class="w-full")
</template>

<script setup>
const menuItems = [
  { label: 'Home', icon: 'i-mdi-home', to: '/' },
  { label: 'Help', icon: 'i-mdi-help-circle', to: '/help' },
  { label: 'CRUDL as User', icon: 'i-mdi-help-circle', url: '/demo/crudl' },
  { label: 'CRUDL as Admin', icon: 'i-mdi-help-circle', url: '/demo/admin' },
  { label: 'User Management', icon: 'i-mdi-help-circle', url: '/demo/users' },
]
</script>
