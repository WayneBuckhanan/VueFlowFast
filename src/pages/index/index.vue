<route>
meta:
  title: VFF Application - CRUDL Demo
</route>

<template lang="pug">
.m-8.flex-none
  .flex.flex-col.gap-6
    // Welcome section
    .welcome-section
      template(v-if="authStore.isAuthenticated")
        h1.text-3xl.font-bold Welcome back, {{ authStore.user?.email }}!
        p.text-gray-600 Complete CRUDL demonstration with parent-child relationships
      template(v-else)
        h1.text-3xl.font-bold VFF Cloudflare CRUDL Demo
        p.text-gray-600 Please log in to access the comprehensive CRUDL demonstration.
        Button.mt-4(
          @click="showLogin = true"
          icon="pi pi-sign-in"
          label="Get Started"
          size="large"
        )

    // Authenticated content - CRUDL Demo
    template(v-if="authStore.isAuthenticated")
      Divider

      // Create Items Section
      .create-section
        .flex.justify-between.items-center.mb-4
          h2.text-2xl.font-semibold Create New Items
          Button(
            @click="showCreateDialog = true"
            icon="pi pi-plus"
            label="Create Item"
            severity="success"
          )

      // CRUDL Operations Tabs
      TabView(v-model:activeIndex="activeTab")
        TabPanel(header="Projects")
          .projects-section
            .flex.justify-between.items-center.mb-4
              h3.text-xl.font-semibold Your Projects
              .flex.gap-2
                Button(
                  @click="loadProjects"
                  :loading="loading.projects"
                  icon="pi pi-refresh"
                  label="Refresh"
                  size="small"
                  severity="secondary"
                )
                Button(
                  @click="createProject"
                  icon="pi pi-plus"
                  label="New Project"
                  size="small"
                  severity="success"
                )

            template(v-if="loading.projects")
              .flex.justify-center.p-8
                ProgressSpinner

            template(v-else-if="projects.length > 0")
              .grid(class="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4")
                Card.project-card(v-for="project in projects" :key="project.id")
                  template(#title)
                    .flex.justify-between.items-center
                      span {{ project.data?.name || 'Untitled Project' }}
                      .flex.gap-1
                        Button(
                          @click="editProject(project)"
                          icon="pi pi-pencil"
                          size="small"
                          severity="info"
                          text
                        )
                        Button(
                          @click="deleteProject(project)"
                          icon="pi pi-trash"
                          size="small"
                          severity="danger"
                          text
                        )
                  template(#content)
                    p.text-sm.text-gray-600.mb-3 {{ project.data?.description || 'No description' }}
                    .flex.justify-between.items-center.text-xs.text-gray-500
                      span Created: {{ formatDate(project.meta?.createdAt) }}
                      span Tasks: {{ getTaskCount(project.id) }}
                    Button.mt-3(
                      @click="viewProjectTasks(project)"
                      icon="pi pi-list"
                      label="View Tasks"
                      size="small"
                      outlined
                    )

            template(v-else)
              .text-center.p-8.text-gray-500
                i.pi.pi-folder-open.text-4xl.mb-4
                p No projects found. Create your first project!

        TabPanel(header="Tasks")
          .tasks-section
            .flex.justify-between.items-center.mb-4
              h3.text-xl.font-semibold 
                | Tasks
                span.text-sm.text-gray-500.ml-2(v-if="selectedProject") for {{ selectedProject.data?.name }}
              .flex.gap-2
                Select(
                  v-model="selectedProject"
                  :options="projects"
                  optionLabel="data.name"
                  placeholder="Select Project"
                  class="w-48"
                  @change="loadTasksForProject"
                )
                Button(
                  @click="loadTasks"
                  :loading="loading.tasks"
                  icon="pi pi-refresh"
                  label="Refresh"
                  size="small"
                  severity="secondary"
                )
                Button(
                  @click="createTask"
                  :disabled="!selectedProject"
                  icon="pi pi-plus"
                  label="New Task"
                  size="small"
                  severity="success"
                )

            template(v-if="loading.tasks")
              .flex.justify-center.p-8
                ProgressSpinner

            template(v-else-if="tasks.length > 0")
              DataTable(:value="tasks" :paginator="true" :rows="10" responsiveLayout="scroll")
                Column(field="data.title" header="Title" sortable)
                  template(#body="{data}")
                    .flex.items-center.gap-2
                      i.pi(:class="getTaskStatusIcon(data.data?.status)")
                      span {{ data.data?.title || 'Untitled Task' }}
                Column(field="data.status" header="Status" sortable)
                  template(#body="{data}")
                    Tag(:value="data.data?.status || 'pending'" :severity="getTaskStatusSeverity(data.data?.status)")
                Column(field="data.priority" header="Priority" sortable)
                  template(#body="{data}")
                    Tag(:value="data.data?.priority || 'medium'" :severity="getPrioritySeverity(data.data?.priority)")
                Column(field="meta.createdAt" header="Created" sortable)
                  template(#body="{data}")
                    span {{ formatDate(data.meta?.createdAt) }}
                Column(header="Actions")
                  template(#body="{data}")
                    .flex.gap-1
                      Button(
                        @click="editTask(data)"
                        icon="pi pi-pencil"
                        size="small"
                        severity="info"
                        text
                      )
                      Button(
                        @click="viewSubtasks(data)"
                        icon="pi pi-sitemap"
                        size="small"
                        severity="secondary"
                        text
                      )
                      Button(
                        @click="deleteTask(data)"
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        text
                      )

            template(v-else)
              .text-center.p-8.text-gray-500
                i.pi.pi-check-square.text-4xl.mb-4
                p(v-if="selectedProject") No tasks found for this project.
                p(v-else) Select a project to view tasks.

        TabPanel(header="Subtasks")
          .subtasks-section
            .flex.justify-between.items-center.mb-4
              h3.text-xl.font-semibold 
                | Subtasks
                span.text-sm.text-gray-500.ml-2(v-if="selectedTask") for {{ selectedTask.data?.title }}
              .flex.gap-2
                Select(
                  v-model="selectedTask"
                  :options="tasks"
                  optionLabel="data.title"
                  placeholder="Select Task"
                  class="w-48"
                  @change="loadSubtasksForTask"
                )
                Button(
                  @click="loadSubtasks"
                  :loading="loading.subtasks"
                  icon="pi pi-refresh"
                  label="Refresh"
                  size="small"
                  severity="secondary"
                )
                Button(
                  @click="createSubtask"
                  :disabled="!selectedTask"
                  icon="pi pi-plus"
                  label="New Subtask"
                  size="small"
                  severity="success"
                )

            template(v-if="loading.subtasks")
              .flex.justify-center.p-8
                ProgressSpinner

            template(v-else-if="subtasks.length > 0")
              .grid(class="grid-cols-1 md:grid-cols-2 gap-4")
                Card.subtask-card(v-for="subtask in subtasks" :key="subtask.id")
                  template(#title)
                    .flex.justify-between.items-center
                      .flex.items-center.gap-2
                        i.pi(:class="getTaskStatusIcon(subtask.data?.status)")
                        span {{ subtask.data?.title || 'Untitled Subtask' }}
                      .flex.gap-1
                        Button(
                          @click="editSubtask(subtask)"
                          icon="pi pi-pencil"
                          size="small"
                          severity="info"
                          text
                        )
                        Button(
                          @click="deleteSubtask(subtask)"
                          icon="pi pi-trash"
                          size="small"
                          severity="danger"
                          text
                        )
                  template(#content)
                    p.text-sm.mb-2 {{ subtask.data?.description || 'No description' }}
                    .flex.justify-between.items-center
                      Tag(:value="subtask.data?.status || 'pending'" :severity="getTaskStatusSeverity(subtask.data?.status)")
                      span.text-xs.text-gray-500 {{ formatDate(subtask.meta?.createdAt) }}

            template(v-else)
              .text-center.p-8.text-gray-500
                i.pi.pi-list.text-4xl.mb-4
                p(v-if="selectedTask") No subtasks found for this task.
                p(v-else) Select a task to view subtasks.

        TabPanel(header="All Items")
          .all-items-section
            .flex.justify-between.items-center.mb-4
              h3.text-xl.font-semibold All Your Items
              .flex.gap-2
                Select(
                  v-model="selectedItemType"
                  :options="itemTypeOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Filter by type"
                  class="w-48"
                  @change="loadAllItems"
                )
                Button(
                  @click="loadAllItems"
                  :loading="loading.allItems"
                  icon="pi pi-refresh"
                  label="Refresh"
                  size="small"
                  severity="secondary"
                )

            template(v-if="loading.allItems")
              .flex.justify-center.p-8
                ProgressSpinner

            template(v-else-if="allItems.length > 0")
              DataTable(:value="allItems" :paginator="true" :rows="15" responsiveLayout="scroll")
                Column(field="type" header="Type" sortable)
                  template(#body="{data}")
                    Tag(:value="data.type" :severity="getTypeSeverity(data.type)")
                Column(field="id" header="ID" sortable)
                Column(field="data" header="Data")
                  template(#body="{data}")
                    .max-w-xs.overflow-hidden
                      pre.text-xs.whitespace-pre-wrap {{ JSON.stringify(data.data, null, 2) }}
                Column(field="parentType" header="Parent" sortable)
                  template(#body="{data}")
                    span(v-if="data.parentType") {{ data.parentType }}/{{ data.parentId }}
                    span.text-gray-400(v-else) Root
                Column(field="meta.createdAt" header="Created" sortable)
                  template(#body="{data}")
                    span {{ formatDate(data.meta?.createdAt) }}
                Column(header="Actions")
                  template(#body="{data}")
                    .flex.gap-1
                      Button(
                        @click="editItem(data)"
                        icon="pi pi-pencil"
                        size="small"
                        severity="info"
                        text
                      )
                      Button(
                        @click="deleteItem(data)"
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        text
                      )

            template(v-else)
              .text-center.p-8.text-gray-500
                i.pi.pi-database.text-4xl.mb-4
                p No items found.

// Create/Edit Dialog
Dialog(
  v-model:visible="showCreateDialog"
  :header="editingItem ? 'Edit Item' : 'Create New Item'"
  :modal="true"
  class="w-96"
)
  .flex.flex-col.gap-4
    .field
      label.block.text-sm.font-medium.mb-1 Type
      Select(
        v-model="newItem.type"
        :options="itemTypeOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Select type"
        class="w-full"
        :disabled="editingItem"
      )
    
    .field(v-if="newItem.type === 'project'")
      label.block.text-sm.font-medium.mb-1 Project Name
      InputText(v-model="newItem.data.name" placeholder="Enter project name" class="w-full")
      label.block.text-sm.font-medium.mb-1.mt-2 Description
      Textarea(v-model="newItem.data.description" placeholder="Enter description" class="w-full" rows="3")
    
    .field(v-if="newItem.type === 'task'")
      label.block.text-sm.font-medium.mb-1 Parent Project
      Select(
        v-model="newItem.parentId"
        :options="projects"
        optionLabel="data.name"
        optionValue="id"
        placeholder="Select project"
        class="w-full"
      )
      label.block.text-sm.font-medium.mb-1.mt-2 Task Title
      InputText(v-model="newItem.data.title" placeholder="Enter task title" class="w-full")
      label.block.text-sm.font-medium.mb-1.mt-2 Description
      Textarea(v-model="newItem.data.description" placeholder="Enter description" class="w-full" rows="2")
      label.block.text-sm.font-medium.mb-1.mt-2 Status
      Select(
        v-model="newItem.data.status"
        :options="statusOptions"
        placeholder="Select status"
        class="w-full"
      )
      label.block.text-sm.font-medium.mb-1.mt-2 Priority
      Select(
        v-model="newItem.data.priority"
        :options="priorityOptions"
        placeholder="Select priority"
        class="w-full"
      )
    
    .field(v-if="newItem.type === 'subtask'")
      label.block.text-sm.font-medium.mb-1 Parent Task
      Select(
        v-model="newItem.parentId"
        :options="tasks"
        optionLabel="data.title"
        optionValue="id"
        placeholder="Select task"
        class="w-full"
      )
      label.block.text-sm.font-medium.mb-1.mt-2 Subtask Title
      InputText(v-model="newItem.data.title" placeholder="Enter subtask title" class="w-full")
      label.block.text-sm.font-medium.mb-1.mt-2 Description
      Textarea(v-model="newItem.data.description" placeholder="Enter description" class="w-full" rows="2")
      label.block.text-sm.font-medium.mb-1.mt-2 Status
      Select(
        v-model="newItem.data.status"
        :options="statusOptions"
        placeholder="Select status"
        class="w-full"
      )

  template(#footer)
    .flex.justify-end.gap-2
      Button(
        @click="showCreateDialog = false"
        label="Cancel"
        severity="secondary"
        outlined
      )
      Button(
        @click="saveItem"
        :loading="saving"
        :label="editingItem ? 'Update' : 'Create'"
        severity="success"
      )

// Delete Confirmation Dialog
Dialog(
  v-model:visible="showDeleteDialog"
  header="Confirm Delete"
  :modal="true"
  class="w-96"
)
  p Are you sure you want to delete this {{ itemToDelete?.type }}?
  p.text-sm.text-gray-600.mt-2(v-if="itemToDelete?.type === 'project'") 
    | This will also delete all associated tasks and subtasks.
  p.text-sm.text-gray-600.mt-2(v-if="itemToDelete?.type === 'task'") 
    | This will also delete all associated subtasks.
  
  template(#footer)
    .flex.justify-end.gap-2
      Button(
        @click="showDeleteDialog = false"
        label="Cancel"
        severity="secondary"
        outlined
      )
      Button(
        @click="confirmDelete"
        :loading="deleting"
        label="Delete"
        severity="danger"
      )

// Auth Modal
AuthModal(
  v-model:visible="showLogin"
  @authenticated="handleAuthenticated"
  @error="handleAuthError"
)
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useToast } from 'primevue/usetoast'
import { api } from '../../api'
import AuthModal from '../../components/auth/AuthModal.vue'

// Auth
const authStore = useAuthStore()
const toast = useToast()
const showLogin = ref(false)

// UI State
const activeTab = ref(0)
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const editingItem = ref(null)
const itemToDelete = ref(null)

// Loading states
const loading = ref({
  projects: false,
  tasks: false,
  subtasks: false,
  allItems: false
})
const saving = ref(false)
const deleting = ref(false)

// Data
const projects = ref([])
const tasks = ref([])
const subtasks = ref([])
const allItems = ref([])

// Selected items for filtering
const selectedProject = ref(null)
const selectedTask = ref(null)
const selectedItemType = ref('all')

// Form data
const newItem = ref({
  type: 'project',
  data: {},
  parentType: null,
  parentId: null
})

// Options
const itemTypeOptions = [
  { label: 'All Types', value: 'all' },
  { label: 'Project', value: 'project' },
  { label: 'Task', value: 'task' },
  { label: 'Subtask', value: 'subtask' }
]

const statusOptions = ['pending', 'in-progress', 'completed', 'cancelled']
const priorityOptions = ['low', 'medium', 'high', 'urgent']

// Computed
const getTaskCount = (projectId) => {
  return tasks.value.filter(task => task.parentId === projectId).length
}

// Methods
const resetForm = () => {
  newItem.value = {
    type: 'project',
    data: {},
    parentType: null,
    parentId: null
  }
  editingItem.value = null
}

const loadProjects = async () => {
  loading.value.projects = true
  try {
    const response = await api.getUserData('project')
    projects.value = response.items || []
  } catch (error) {
    console.error('Failed to load projects:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load projects',
      life: 5000
    })
  } finally {
    loading.value.projects = false
  }
}

const loadTasks = async () => {
  loading.value.tasks = true
  try {
    const response = await api.getUserData('task')
    tasks.value = response.items || []
  } catch (error) {
    console.error('Failed to load tasks:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load tasks',
      life: 5000
    })
  } finally {
    loading.value.tasks = false
  }
}

const loadTasksForProject = async () => {
  if (!selectedProject.value) return
  
  loading.value.tasks = true
  try {
    const response = await api.getChildren('project', selectedProject.value.id, 'task')
    tasks.value = response.items || []
  } catch (error) {
    console.error('Failed to load tasks for project:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load tasks for project',
      life: 5000
    })
  } finally {
    loading.value.tasks = false
  }
}

const loadSubtasks = async () => {
  loading.value.subtasks = true
  try {
    const response = await api.getUserData('subtask')
    subtasks.value = response.items || []
  } catch (error) {
    console.error('Failed to load subtasks:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load subtasks',
      life: 5000
    })
  } finally {
    loading.value.subtasks = false
  }
}

const loadSubtasksForTask = async () => {
  if (!selectedTask.value) return
  
  loading.value.subtasks = true
  try {
    const response = await api.getChildren('task', selectedTask.value.id, 'subtask')
    subtasks.value = response.items || []
  } catch (error) {
    console.error('Failed to load subtasks for task:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load subtasks for task',
      life: 5000
    })
  } finally {
    loading.value.subtasks = false
  }
}

const loadAllItems = async () => {
  loading.value.allItems = true
  try {
    const response = await api.getUserData(selectedItemType.value)
    allItems.value = response.items || []
  } catch (error) {
    console.error('Failed to load all items:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load items',
      life: 5000
    })
  } finally {
    loading.value.allItems = false
  }
}

// CRUD Operations
const createProject = () => {
  resetForm()
  newItem.value.type = 'project'
  newItem.value.data = { name: '', description: '' }
  showCreateDialog.value = true
}

const createTask = () => {
  resetForm()
  newItem.value.type = 'task'
  newItem.value.parentType = 'project'
  newItem.value.parentId = selectedProject.value?.id || null
  newItem.value.data = { title: '', description: '', status: 'pending', priority: 'medium' }
  showCreateDialog.value = true
}

const createSubtask = () => {
  resetForm()
  newItem.value.type = 'subtask'
  newItem.value.parentType = 'task'
  newItem.value.parentId = selectedTask.value?.id || null
  newItem.value.data = { title: '', description: '', status: 'pending' }
  showCreateDialog.value = true
}

const editProject = (project) => {
  editingItem.value = project
  newItem.value = {
    type: project.type,
    id: project.id,
    data: { ...project.data },
    parentType: project.parentType,
    parentId: project.parentId
  }
  showCreateDialog.value = true
}

const editTask = (task) => {
  editingItem.value = task
  newItem.value = {
    type: task.type,
    id: task.id,
    data: { ...task.data },
    parentType: task.parentType,
    parentId: task.parentId
  }
  showCreateDialog.value = true
}

const editSubtask = (subtask) => {
  editingItem.value = subtask
  newItem.value = {
    type: subtask.type,
    id: subtask.id,
    data: { ...subtask.data },
    parentType: subtask.parentType,
    parentId: subtask.parentId
  }
  showCreateDialog.value = true
}

const editItem = (item) => {
  editingItem.value = item
  newItem.value = {
    type: item.type,
    id: item.id,
    data: { ...item.data },
    parentType: item.parentType,
    parentId: item.parentId
  }
  showCreateDialog.value = true
}

const saveItem = async () => {
  saving.value = true
  try {
    if (editingItem.value) {
      // Update existing item
      await api.updateItem(newItem.value.type, newItem.value.id, newItem.value.data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `${newItem.value.type} updated successfully`,
        life: 3000
      })
    } else {
      // Create new item
      await api.createItem(newItem.value)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `${newItem.value.type} created successfully`,
        life: 3000
      })
    }
    
    showCreateDialog.value = false
    resetForm()
    
    // Refresh relevant data
    await refreshData()
  } catch (error) {
    console.error('Failed to save item:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to ${editingItem.value ? 'update' : 'create'} ${newItem.value.type}`,
      life: 5000
    })
  } finally {
    saving.value = false
  }
}

const deleteProject = (project) => {
  itemToDelete.value = project
  showDeleteDialog.value = true
}

const deleteTask = (task) => {
  itemToDelete.value = task
  showDeleteDialog.value = true
}

const deleteSubtask = (subtask) => {
  itemToDelete.value = subtask
  showDeleteDialog.value = true
}

const deleteItem = (item) => {
  itemToDelete.value = item
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!itemToDelete.value) return
  
  deleting.value = true
  try {
    await api.deleteItem(itemToDelete.value.type, itemToDelete.value.id)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `${itemToDelete.value.type} deleted successfully`,
      life: 3000
    })
    
    showDeleteDialog.value = false
    itemToDelete.value = null
    
    // Refresh relevant data
    await refreshData()
  } catch (error) {
    console.error('Failed to delete item:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to delete ${itemToDelete.value.type}`,
      life: 5000
    })
  } finally {
    deleting.value = false
  }
}

// Helper methods
const refreshData = async () => {
  await Promise.all([
    loadProjects(),
    loadTasks(),
    loadSubtasks(),
    loadAllItems()
  ])
}

const viewProjectTasks = (project) => {
  selectedProject.value = project
  activeTab.value = 1
  loadTasksForProject()
}

const viewSubtasks = (task) => {
  selectedTask.value = task
  activeTab.value = 2
  loadSubtasksForTask()
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

const getTaskStatusIcon = (status) => {
  switch (status) {
    case 'completed': return 'pi-check-circle text-green-500'
    case 'in-progress': return 'pi-clock text-blue-500'
    case 'cancelled': return 'pi-times-circle text-red-500'
    default: return 'pi-circle text-gray-400'
  }
}

const getTaskStatusSeverity = (status) => {
  switch (status) {
    case 'completed': return 'success'
    case 'in-progress': return 'info'
    case 'cancelled': return 'danger'
    default: return 'secondary'
  }
}

const getPrioritySeverity = (priority) => {
  switch (priority) {
    case 'urgent': return 'danger'
    case 'high': return 'warning'
    case 'medium': return 'info'
    case 'low': return 'secondary'
    default: return 'secondary'
  }
}

const getTypeSeverity = (type) => {
  switch (type) {
    case 'project': return 'success'
    case 'task': return 'info'
    case 'subtask': return 'warning'
    default: return 'secondary'
  }
}

const handleAuthenticated = (user) => {
  toast.add({
    severity: 'success',
    summary: 'Welcome!',
    detail: `Successfully logged in as ${user.email}`,
    life: 3000
  })
  refreshData()
}

const handleAuthError = (error) => {
  toast.add({
    severity: 'error',
    summary: 'Authentication Error',
    detail: error,
    life: 5000
  })
}

// Load data on mount if authenticated
onMounted(() => {
  if (authStore.isAuthenticated) {
    refreshData()
  }
})
</script>

<style scoped>
.welcome-section {
  text-align: center;
  padding: 2rem 0;
}

.project-card, .subtask-card {
  height: 100%;
}

.create-section, .projects-section, .tasks-section, .subtasks-section, .all-items-section {
  margin-top: 1rem;
}

:deep(.p-tabview-panels) {
  padding: 1rem 0;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.75rem;
}

:deep(.p-card .p-card-body) {
  padding: 1rem;
}

:deep(.p-card .p-card-title) {
  font-size: 1.1rem;
  font-weight: 600;
}

:deep(.p-dialog .p-dialog-content) {
  padding: 1.5rem;
}
</style>
