<template lang="pug">
Menu(:model="menuItems").mx-2
</template>

<script setup>
const menuItems = [
  { label: 'Home', icon: 'pi pi-home', url: '/' },
  { label: 'Help', icon: 'pi pi-question', url: '/help' },
]
</script>
