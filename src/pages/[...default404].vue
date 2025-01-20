<template lang="pug">
main
  .h-dvh.flex.flex-col.place-items-center
    .flex-grow-0.flex-col.place-items-center.mt-12
      .text-2xl.opacity-60
        | Oops. Nothing here...
      .text-base.opacity-80
        | {{ lostPath }} might be a typo?
      router-link(to="/")
        button.rounded-xl.border-2.w-full.p-4.my-8
          | Go Home
    .w-full.h-full.place-items-center
      svg.w-full.h-fit.block.fill-slate-500(viewBox="0 0 30 15")
        text(x="50%" y="55%" text-anchor="middle" alignment-baseline="middle" preserveAspectRatio="xMinYMin meet")
          | 404
</template>

<script setup>
const route = useRoute()
const lostPath = route.params["default404"]
// assuming this is still named `[...default404].vue`, the `...` matches any unresolvable route and leaves that match in the `default404` route param.
// Ideally, we'd just name it `...404.vue` but it borks on the [match] starting with a numeral. :shrug:
</script>
