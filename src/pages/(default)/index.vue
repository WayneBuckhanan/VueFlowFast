<route>
meta:
  title: Remote Storage CRUDL Demo
</route>

<template lang="pug">
.m-8.flex-none
  .flex.flex-col.gap-6
    template(v-if="authStore.isAuthenticated")
      UButton(label="Logout" @click="authStore.logout()")
    LoginOTP(v-else)
    h1.text-3xl Hello
    .prose
      p Logged In? {{ authStore.isAuthenticated }}
      p Admin? {{ authStore.isAdmin }}
      p Sneaky admin? {{ authStore.isImpersonating }}
      p User: {{ authStore.user }}
      p Session: {{ authStore.session }}
    template(v-if="authStore.isAuthenticated")
      h1.text-3xl CRUDL Demo with Local Storage
      .flex.gap-3.items-end
        UInput(v-model="newItemText" placeholder="New item text")
        UButton(@click="handleCreate" label="Create Top-Level" color="success")
        template(v-if="selectedItem")
          UInput(v-model="newChildText" placeholder="New child item").ml-2
          UButton(
            @click="handleCreateChild"
            label="Create Child"
            color="primary"
            :disabled="!selectedItem"
          )

      .flex.gap-4.items-center
        URadioGroup(
          v-model="filterType"
          name="filter"
          orientation="horizontal"
          :items="filterOptions"
        )

      UTable(
        :data="items"
        v-model:row-selection="selectedIds"
        :columns="columns"
        :get-row-id="(row) => row.id"
        @select="onRowSelect"
      )
        template(#actions-cell="{ row }")
          .flex.gap-2
            UButton(
              @click="handleUpdate(row.original)"
              icon="i-lucide-pencil"
              color="info"
              size="sm"
              square
            )
            UButton(
              @click="handleDelete(row.original)"
              icon="i-lucide-trash-2"
              color="error"
              size="sm"
              square
            )

      UButton(@click="refreshItems()" label="Refresh List" color="neutral")

      .p-4.rounded-lg.border.border-default(v-if="selectedItem")
        h2.font-bold.mb-2 Selected Item Details
        .grid.grid-cols-2.gap-2
          .font-semibold ID:
          .font-mono {{ selectedItem.id }}
          .font-semibold Type:
          .font-mono {{ selectedItem.type }}
          .font-semibold Parent Type:
          .font-mono {{ selectedItem.parentType || 'None' }}
          .font-semibold Parent ID:
          .font-mono {{ selectedItem.parentId || 'None' }}
          .font-semibold Text:
          .font-mono {{ selectedItem.data?.text || 'None' }}
          .font-semibold Created:
          .font-mono {{ selectedItem.meta?.createdAt }}
          .font-semibold Updated:
          .font-mono {{ selectedItem.meta?.updatedAt }}

      template(v-if="children?.length")
        h3.font-bold.mt-4 Children:
        UTable(:data="children" :columns="childColumns")
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect, onMounted } from 'vue'
import { useAuthStore } from '@/stores/betterAuth'
const authStore = useAuthStore()

import * as CRUDL from '@/crudl-client'

interface DemoItem {
  id: string
  type: string
  parentId: string
  parentType: string
  data: {
    text: string
  }
  meta: {
    createdAt: string
    updatedAt: string
  }
}

const newItemText = ref('')
const filterType = ref('all')
const newChildText = ref('')
const items = ref<DemoItem[]>([])
const selectedIds = ref<Record<string, boolean>>({})
const children = ref<DemoItem[]>([])

const selectedItem = computed(() => items.value.find((item) => selectedIds.value[item.id]))

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Root', value: 'demo' },
  { label: 'Child', value: 'demo-child' },
]

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'data.text', header: 'Text' },
  { id: 'actions', header: 'Actions', enableHiding: false },
]

const childColumns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'data.text', header: 'Text' },
]

watchEffect(async () => {
  if (!selectedItem.value) {
    children.value = []
    return
  }
  const { items } = await CRUDL.listChildren(selectedItem.value.type, selectedItem.value.id)
  children.value = items as DemoItem[]
})

function onRowSelect(_e: Event, row: { id: string }) {
  // Enforce single selection semantics (TanStack toggles on re-click)
  selectedIds.value = { [row.id]: true }
}

async function refreshItems(type = filterType.value) {
  const response = await CRUDL.listUserItems(type === 'all' ? undefined : type)
  items.value = response.items as DemoItem[]
}

watch(filterType, () => refreshItems())

async function handleCreate() {
  if (!newItemText.value) return

  await CRUDL.createItem({
    type: 'demo',
    data: { text: newItemText.value }
  })
  newItemText.value = ''
  await refreshItems()
}

async function handleCreateChild() {
  if (!newChildText.value || !selectedItem.value) return

  await CRUDL.createItem({
    type: 'demo-child',
    data: { text: newChildText.value },
    parentType: selectedItem.value.type || 'demo',
    parentId: selectedItem.value.id
  })
  newChildText.value = ''
  await refreshItems()
}

async function handleUpdate(item: DemoItem) {
  const newText = prompt('Edit text:', item.data.text)
  if (newText !== null) {
    await CRUDL.updateItemData(item.type, item.id, { text: newText })
    await refreshItems()
  }
}

async function handleDelete(item: DemoItem) {
  if (confirm('Delete this item?')) {
    await CRUDL.deleteItem(item.type, item.id)
    await refreshItems()
  }
}

onMounted(refreshItems)
</script>
