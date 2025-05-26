<route>
meta:
  title: Local Storage CRUDL Demo
</route>

<template lang="pug">
.m-8.flex-none
  .flex.flex-col.gap-6
    h1.text-3xl CRUDL Demo with Local Storage
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
    
    DataTable(
      :value="items"
      v-model:selection="selectedItem"
      selectionMode="single"
      dataKey="id"
    )
      Column(field="id" header="ID")
      Column(field="data.text" header="Text")
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
    
    Button(@click="refreshItems" label="Refresh List" severity="secondary")
    
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
import { ref, onMounted, watchEffect } from 'vue'
import { createItem, readItem, updateItem, deleteItem, listUserItems, listChildren } from '@/localApi'

interface DemoItem {
  id: string
  data: {
    text: string
  }
}

const newItemText = ref('')
const newChildText = ref('')
const items = ref<DemoItem[]>([])
const selectedItem = ref<DemoItem>()
const children = ref<DemoItem[]>([])
watchEffect(async () => {
  if (!selectedItem.value) {
    children.value = []
    return
  }
  const { items } = await listChildren(selectedItem.value.type, selectedItem.value.id)
  children.value = items as DemoItem[]
})

async function refreshItems() {
  const response = await listUserItems()
  items.value = response.items as DemoItem[]
}

async function handleCreate() {
  if (!newItemText.value) return
  
  await createItem({
    type: 'demo',
    data: { text: newItemText.value }
  })
  newItemText.value = ''
  await refreshItems()
}

async function handleCreateChild() {
  if (!newChildText.value || !selectedItem.value) return
  
  await createItem({
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
    await updateItem('demo', item.id, { text: newText })
    await refreshItems()
  }
}

async function handleDelete(item: DemoItem) {
  if (confirm('Delete this item?')) {
    await deleteItem(item.type, item.id)
    await refreshItems()
  }
}

onMounted(refreshItems)
</script>
