<template lang="pug">
p.h-4
VaSidebarItem(to="/")
  VaSidebarItemContent
    VaIcon(name="home")
    VaSidebarItemTitle Home
VaSidebarItem(to="help")
  VaSidebarItemContent
    VaIcon(name="help")
    VaSidebarItemTitle Help
</template>
