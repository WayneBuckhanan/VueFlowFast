<template lang="pug">
Menu(:model="menuItems").mx-2
</template>

<script setup>
const menuItems = [
  { label: 'Home', icon: 'iconify mdi--home', url: '/' },
  { label: 'Help', icon: 'iconify mdi--help', url: '/help' },
]
</script>
