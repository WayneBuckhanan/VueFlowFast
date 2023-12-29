<route>
meta: { layout: blank }
</route>

<template lang="pug">
.h-dvh.flex.flex-col.flex-center
  section.flex-grow-0.flex-col.flex-center.mt-12
    .text-2xl.opacity-60
      | Oops. Nothing here...
    router-link(to="/")
      button.my-8.p-4.rounded-xl.border-2
        | Go Home
  section
    .w-full.h-full
      svg.w-full.h-full.block.fill-slate-500(viewBox="0 0 30 10")
        text(x="50%" y="50%" text-anchor="middle" alignment-baseline="middle" preserveAspectRatio="xMinYMin meet")
          | 404
</template>
