<template lang="pug">
Menu(:model="menuItems").mx-2
</template>

<script setup>
const menuItems = [
  { label: 'Home', icon: 'iconify mdi--home', url: '/' },
  { label: 'Help', icon: 'iconify mdi--help', url: '/help' },
  { label: 'CRUDL as User', icon: 'iconify mdi--help', url: '/demo/crudl' },
  { label: 'CRUDL as Admin', icon: 'iconify mdi--help', url: '/demo/admin' },
  { label: 'User Management', icon: 'iconify mdi--help', url: '/demo/users' },
]
</script>
