<template lang="pug">
p.h-4
VaSidebarItem(to="/")
  VaSidebarItemContent
    icon-mdi-home
    VaSidebarItemTitle Home
VaSidebarItem(to="help")
  VaSidebarItemContent
    icon-mdi-help
    VaSidebarItemTitle Help
</template>
