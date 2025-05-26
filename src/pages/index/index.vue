<route>
meta:
  title: Local Storage CRUDL Demo
</route>

<template lang="pug">
.m-8.flex-none
  .flex.flex-col.gap-6
    h1.text-3xl CRUDL Demo with Local Storage
    .flex.gap-3
      InputText(v-model="newItemText" placeholder="New item text")
      Button(@click="handleCreate" label="Create" severity="success")
    
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
    .text-lg Selected: {{ selectedItem?.data?.text }}
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createItem, readItem, updateItem, deleteItem, listUserItems } from '@/localApi'

interface DemoItem {
  id: string
  data: {
    text: string
  }
}

const newItemText = ref('')
const items = ref<DemoItem[]>([])
const selectedItem = ref<DemoItem>()

async function refreshItems() {
  const response = await listUserItems('demo')
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

async function handleUpdate(item: DemoItem) {
  const newText = prompt('Edit text:', item.data.text)
  if (newText !== null) {
    await updateItem('demo', item.id, { text: newText })
    await refreshItems()
  }
}

async function handleDelete(item: DemoItem) {
  if (confirm('Delete this item?')) {
    await deleteItem('demo', item.id)
    await refreshItems()
  }
}

onMounted(refreshItems)
</script>
