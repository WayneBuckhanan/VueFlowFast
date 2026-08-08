<template lang="pug">
UError(:error)
</template>

<script setup>
const route = useRoute()
const lostPath = route.params["default404"]
const error = {
  statusCode: 404,
  statusMessage: 'Oops. Nothing here...',
  message: `/${lostPath} might be a typo?`,
}
// assuming this is still named `[...default404].vue`, the `...` matches any unresolvable route and leaves that match in the `default404` route param.
// Ideally, we'd just name it `...404.vue` but it borks on the [match] starting with a numeral. :shrug:
</script>
