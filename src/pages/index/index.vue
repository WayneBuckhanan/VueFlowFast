<route>
meta:
  title: I love to count! Ah ha ha ha!
</route>

<template lang="pug">
.m-8.flex-none
  .flex.flex-col.gap-4
    h1.text-3xl Hello
    .text-base Count is {{ count }}
    Button(@click="increment" class="rotate-0 rotate-90 rotate-180 rotate-270 !rotate-0").bg-emerald-500.rounded.w-fit.p-2
      | Add One
    .text-base: i(:class="`rotate-${90*count}`").origin-center.pi.pi-flag-fill.w-4
</template>

<script setup>
const count = ref(0)
function increment() {
  count.value = (count.value+1)%4
}
</script>
