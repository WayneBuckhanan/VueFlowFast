<route>
meta:
  title: I love to count! Ah ha ha ha!
</route>

<template lang="pug">
.m-8
  .flex.flex-col.gap-4
    h1.text-3xl Hello
    | Count is {{ count }}
    button(@click="increment").bg-emerald-500.rounded.w-fit.p-2
      | Add One
</template>

<script setup>
const count = ref(1)
function increment() {
  count.value++
}
</script>
