<route>
meta:
  title: This is the index page
</route>

<template lang="pug">
.m-8.flex-none
  .flex.flex-col.gap-4
    h1.text-3xl Hello
    .text-base Count is {{ count }}
    UButton.w-fit(
      label="Add One"
      @click="increment"
      color="success"
      class="rotate-0 rotate-90 rotate-180 rotate-270 !rotate-0" /* so Tailwind knows to include them for the conditional below */
    )
    UIcon.w-8.h-8(
      name="i-mdi-umbrella"
      :class="`rotate-${90*(count%4)}`"
    )
</template>

<script setup>
const count = ref(0)
function increment() {
  count.value = (count.value+1)
}
</script>
