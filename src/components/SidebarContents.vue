<template lang="pug">
UNavigationMenu(:items="menuItems" orientation="vertical" class="w-full")
</template>

<script setup>
const menuItems = [
  { label: 'Home', icon: 'i-mdi-home', to: '/' },
  { label: 'Help', icon: 'i-mdi-help-circle', to: '/help' },
]
</script>
