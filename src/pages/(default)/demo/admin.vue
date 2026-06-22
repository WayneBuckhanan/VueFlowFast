<route>
meta:
  title: CRUDL Demo (as Admin)
</route>

<template lang="pug">
.m-8.flex-none
  // --- Authorization Gates ---
  div(v-if="!authStore.isAuthenticated")
    Card
      template(#content) Please log in to view this page.
  div(v-else-if="!authStore.isAdmin")
    Card
      template(#content)
        .text-red-600.font-bold You do not have administrator privileges to access this page.
  div(v-else)
    .flex.flex-col.gap-6
      h1.text-3xl CRUDL Demo with Remote Storage
      .flex.gap-3.items-end
        InputText(v-model="newItemText" placeholder="New item text")
        Button(@click="handleCreate" label="Create Top-Level" severity="success")
        template(v-if="selectedItem")
          InputText(v-model="newChildText" placeholder="New child item").ml-2
          Button(
            @click="handleCreateChild"
            label="Create Child"
            severity="help"
            :disabled="!selectedItem"
          )

      .flex.gap-4.items-center
        .flex.gap-2.items-center
          RadioButton(v-model="filterType" inputId="filterAll" value="all" name="filter")
          label(for="filterAll") All
          RadioButton(v-model="filterType" inputId="filterRoot" value="demo" name="filter")
          label(for="filterRoot") Root
          RadioButton(v-model="filterType" inputId="filterChild" value="demo-child" name="filter")
          label(for="filterChild") Child
        .flex.gap-2.items-center.ml-4
          label(for="userFilter") User:
          Select#userFilter(
            v-model="selectedUserId"
            :options="userSelectOptions"
            optionLabel="displayLabel"
            optionValue="id"
            placeholder="All Users"
            :showClear="true"
            style="width: 250px"
          )
          Button(@click="loadUsers()" label="Refresh Users" severity="secondary" size="small")
        .flex.gap-2.items-center.ml-4
          Checkbox(v-model="filterByUser" inputId="filterByUser" binary)
          label(for="filterByUser") Filter table by selected user

      DataTable(
        :value="items"
        v-model:selection="selectedItem"
        selectionMode="single"
        dataKey="id"
      )
        Column(field="id" header="ID")
        Column(field="data.text" header="Text")
        Column(header="User")
          template(#body="{data}")
            span {{ data.user ? (userDisplayMap.get(data.user) || data.user) : 'None' }}
        Column(header="Actions")
          template(#body="{data}")
            .flex.gap-2
              Button(
                @click="handleUpdate(data)"
                icon="pi pi-pencil" 
                severity="info"
                rounded
              )
              Button(
                @click="handleDelete(data)"
                icon="pi pi-trash"
                severity="danger"
                rounded
              )

      Button(@click="refreshItems()" label="Refresh List" severity="secondary")

      .p-4.rounded-lg(v-if="selectedItem")
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
        DataTable(:value="children")
          Column(field="id" header="ID")
          Column(field="data.text" header="Text")
</template>

<script setup lang="ts">
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
const selectedItem = ref<DemoItem>()
const children = ref<DemoItem[]>([])
const users = ref<User[]>([])
const selectedUserId = ref<string>('')
const filterByUser = ref<boolean>(false)

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

watchEffect(async () => {
  if (!selectedItem.value) {
    children.value = []
    return
  }
  const { items } = await CRUDL.listChildren(selectedItem.value.type, selectedItem.value.id)
  children.value = items as DemoItem[]
})

async function refreshItems(type = filterType.value) {
  const response = await CRUDL.listUserItems(
    type === 'all' ? undefined : type,
    filterByUser.value && selectedUserId.value ? { user: selectedUserId.value } : undefined
  )
  items.value = response.items as DemoItem[]
}

watch(filterType, () => refreshItems())
watch(selectedUserId, () => refreshItems())
watch(filterByUser, () => refreshItems())

async function handleCreate() {
  if (!newItemText.value) return
  
  await CRUDL.createItem({
    type: 'demo',
    data: { text: newItemText.value },
    user: selectedUserId.value,
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
    user: selectedUserId.value || selectedItem.value.user,
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
</script>
