<route>
meta:
  title: CRUDL Demo (as Admin)
</route>

<template lang="pug">
.m-8.flex-none
  // --- Authorization Gates ---
  div(v-if="!authStore.isAuthenticated")
    UCard
      p Please log in to view this page.
  div(v-else-if="!authStore.isAdmin")
    UCard
      .text-red-600.font-bold You do not have administrator privileges to access this page.
  div(v-else)
    .flex.flex-col.gap-6
      h1.text-3xl CRUDL Demo with Remote Storage
      .flex.gap-3.items-end
        UInput(v-model="newItemText" placeholder="New item text")
        UButton(
          @click="handleCreate"
          label="Create Top-Level"
          color="success"
          :disabled="multiUserSelected"
        )
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
        .flex.gap-2.items-center.ml-4
          label(for="userFilter") User:
          USelect#userFilter(
            v-model="selectedUserIds"
            :items="userSelectOptions"
            value-key="id"
            label-key="displayLabel"
            placeholder="All Users"
            multiple
            class="w-64"
          )
          UButton(@click="loadUsers()" label="Refresh Users" color="neutral" size="sm")
        .flex.gap-2.items-center.ml-4
          UCheckbox(
            v-model="filterByUser"
            name="filterByUser"
            label="Filter table by selected user"
          )

      UTable(
        :data="items"
        v-model:row-selection="selectedIds"
        :columns="columns"
        :get-row-id="(row) => row.id"
        @select="onRowSelect"
      )
        template(#user-cell="{ row }")
          span {{ row.original.user ? (userDisplayMap.get(row.original.user) || row.original.user) : 'None' }}
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
import { computed, ref, watch, watchEffect, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore, type User } from '@/stores/betterAuth'
const authStore = useAuthStore()

import { useAuthAdminStore } from '@/stores/betterAuthAdmin'
const authAdminStore = useAuthAdminStore()

import * as CRUDL from '@/crudl-client'
CRUDL.makeAdmin()


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
const users = ref<User[]>([])
const selectedUserIds = ref<string[]>([])
const filterByUser = ref<boolean>(false)

const multiUserSelected = computed(() => selectedUserIds.value.length > 1)
const singleSelectedUserId = computed(() => selectedUserIds.value.length === 1 ? selectedUserIds.value[0] : undefined)

const selectedItem = computed(() => items.value.find((item) => selectedIds.value[item.id]))

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Root', value: 'demo' },
  { label: 'Child', value: 'demo-child' },
]

const userSelectOptions = computed(() => {
  const anonymousOption = {
    id: 'anonymous',
    displayLabel: 'Anonymous'
  }
  const userOptions = users.value.map(user => ({
    ...user,
    displayLabel: `${user.name} <${user.email}>`
  }))
  return [anonymousOption, ...userOptions]
})

const userDisplayMap = computed(() => {
  const map = new Map<string, string>()
  users.value.forEach(user => {
    map.set(user.id, `${user.name} <${user.email}>`)
  })
  return map
})

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'data.text', header: 'Text' },
  { id: 'user', header: 'User' },
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
  const response = await CRUDL.listUserItems(
    type === 'all' ? undefined : type,
    filterByUser.value && singleSelectedUserId.value ? { user: singleSelectedUserId.value } : undefined
  )
  items.value = response.items as DemoItem[]
}

watch(filterType, () => refreshItems())
watch(selectedUserIds, () => refreshItems())
watch(filterByUser, () => refreshItems())

async function handleCreate() {
  if (!newItemText.value) return

  await CRUDL.createItem({
    type: 'demo',
    data: { text: newItemText.value },
    user: singleSelectedUserId.value,
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
    parentId: selectedItem.value.id,
    user: singleSelectedUserId.value || selectedItem.value.user,
  })
  newChildText.value = ''
  await refreshItems()
}

async function handleUpdate(item: DemoItem) {
  const newText = prompt('Edit text:', item.data.text)
  if (newText !== null) {
    await CRUDL.updateItemData(item.type, item.id, { text: newText })
    //await CRUDL.upsertItem(item.type, item.id, { ...item, data: { text: newText }, user: selectedUserId.value })
    await refreshItems()
  }
}

async function handleDelete(item: DemoItem) {
  if (confirm('Delete this item?')) {
    await CRUDL.deleteItem(item.type, item.id)
    await refreshItems()
  }
}

async function loadUsers() {
  try {
    const data = await authAdminStore.listUsers()
    users.value = data.users || []
  } catch (error) {
    console.log("Error", error.message)
    users.value = []
  }
}

watch(() => [authStore.isReady, authAdminStore.isReady], async (isReady) => {
  if (isReady[0] && isReady[1]) {
    await nextTick() // let the pinia store mount properly
    loadUsers()
  }
}, { immediate: true })

onMounted(async() => {
  await refreshItems()
})

onUnmounted(() => {
  CRUDL.makeUser() // reset so other pages default back to non-admin access
})
</script>
