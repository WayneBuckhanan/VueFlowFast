<route>
meta:
  title: User Management
</route>

<template lang="pug">
div.container.mx-auto.p-4
  // --- Authorization Gates ---
  div(v-if="!authStore.isAuthenticated")
    UCard
      p Please log in to view this page.
  div(v-else-if="!authStore.isAdmin")
    UCard
      .text-red-600.font-bold You do not have administrator privileges to access this page.
  div(v-else)
    // --- Global Loading & Error Display ---
    UAlert(v-if="authAdminStore.error" color="error" variant="subtle" icon="i-lucide-alert-circle")
      | {{ authAdminStore.error }}
    UProgress(v-if="authAdminStore.isLoading" :model-value="null" animation="carousel")

    .grid.grid-cols-1.gap-6.mt-4(class="lg:grid-cols-2")
      // --- User Management ---
      UCard
        template(#title) User Management
        div
          // Create User Form
          h4.mb-3 Create User
          form(@submit.prevent="handleCreateUser")
            .flex.flex-col.gap-2
              label(for="newUserName") Name
              UInput#newUserName(v-model="newUserForm.name" required)
              label(for="newUserEmail") Email
              UInput#newUserEmail(type="email" v-model="newUserForm.email" required)
              label(for="newUserPassword") Password
              UInput#newUserPassword(type="password" v-model="newUserForm.password" required)
              label(for="newUserRole") Role (optional, comma-separated)
              UInput#newUserRole(v-model="newUserForm.role" placeholder="e.g., user,editor")
              UButton(type="submit" label="Create User" :disabled="authAdminStore.isLoading" class="mt-2")

          USeparator

          // List Users
          h4.mb-3 All Users
          UButton(label="Refresh List" @click="handleListUsers" :disabled="authAdminStore.isLoading")
          UTable(
            :data="usersList"
            :columns="userColumns"
            v-model:sorting="userSorting"
            v-model:pagination="userPagination"
            :features="[getPaginationRowModel]"
            class="mt-3"
          )
            template(#banned-cell="{ row }")
              UBadge(v-if="row.original.banned" color="error" label="Yes")
              UBadge(v-else color="success" label="No")
          UPagination(
            v-if="usersList.length > 0"
            v-model="usersPage"
            :total="usersList.length"
            :items-per-page="10"
            class="mt-3"
          )

          USeparator

          // Update User
          h4.mb-3 Update User
          form(@submit.prevent="handleUpdateUser")
            .flex.flex-col.gap-2
              label(for="updateUserId") User
              USelect#updateUserId(v-model="updateUserForm.id" :items="userSelectOptions" value-key="id" label-key="displayLabel" placeholder="Select a User" required)
              label(for="updateUserName") New Name
              UInput#updateUserName(v-model="updateUserForm.name")
              label(for="updateUserRole") New Role (comma-separated)
              UInput#updateUserRole(v-model="updateUserForm.role" placeholder="e.g., user,editor")
              label(for="updateUserPassword") New Password
              UInput#updateUserPassword(type="password" v-model="updateUserForm.password")
              UButton(type="submit" label="Update User" :disabled="authAdminStore.isLoading" class="mt-2")

          USeparator

          // Delete User
          h4.mb-3 Remove User
          form(@submit.prevent="handleRemoveUser")
            .flex.flex-col.gap-2
              label(for="removeUserId") User
              USelect#removeUserId(v-model="removeUserId" :items="userSelectOptions" value-key="id" label-key="displayLabel" placeholder="Select a User" required)
              UButton(type="submit" label="Remove User" color="error" :disabled="authAdminStore.isLoading" class="mt-2")

      // --- Role Management ---
      UCard
        template(#title) Role Management
        div
          // Set Role
          h4.mb-3 Set User Role
          form(@submit.prevent="handleSetRole")
            .flex.flex-col.gap-2
              label(for="setRoleUserId") User
              USelect#setRoleUserId(v-model="setRoleForm.userId" :items="userSelectOptions" value-key="id" label-key="displayLabel" placeholder="Select a User" required)
              label(for="setRoleValue") New Role (comma-separated)
              UInput#setRoleValue(v-model="setRoleForm.role" required)
              UButton(type="submit" label="Set Role" :disabled="authAdminStore.isLoading" class="mt-2")

      // --- Ban Management ---
      UCard
        template(#title) Ban Management
        div
          // Ban User
          h4.mb-3 Ban User
          form(@submit.prevent="handleBanUser")
            .flex.flex-col.gap-2
              label(for="banUserId") User
              USelect#banUserId(v-model="banUserForm.userId" :items="userSelectOptions" value-key="id" label-key="displayLabel" placeholder="Select a User" required)
              label(for="banReason") Reason (optional)
              UInput#banReason(v-model="banUserForm.banReason")
              label(for="banExpires") Expires In (seconds, optional)
              UInputNumber#banExpires(v-model="banUserForm.banExpiresIn" :use-grouping="false")
              UButton(type="submit" label="Ban User" color="warning" :disabled="authAdminStore.isLoading" class="mt-2")

          USeparator

          // Unban User
          h4.mb-3 Unban User
          form(@submit.prevent="handleUnbanUser")
            .flex.flex-col.gap-2
              label(for="unbanUserId") User
              USelect#unbanUserId(v-model="unbanUserId" :items="userSelectOptions" value-key="id" label-key="displayLabel" placeholder="Select a User" required)
              UButton(type="submit" label="Unban User" :disabled="authAdminStore.isLoading" class="mt-2")

      // --- Session Management ---
      UCard
        template(#title) Session Management
        div
          // List User Sessions
          h4.mb-3 List User Sessions
          form(@submit.prevent="handleListUserSessions")
            .flex.flex-col.gap-2
              label(for="listSessionsUserId") User
              USelect#listSessionsUserId(v-model="listSessionsUserId" :items="userSelectOptions" value-key="id" label-key="displayLabel" placeholder="Select a User" required)
              UButton(type="submit" label="List Sessions" :disabled="authAdminStore.isLoading" class="mt-2")
          UTable(v-if="userSessionsList.length > 0" :data="userSessionsList" :columns="sessionColumns" class="mt-3")
            template(#actions-cell="{ row }")
              UButton(@click="handleRevokeUserSession(row.original.token)" label="Revoke" size="sm" color="error")

          USeparator

          // Revoke All User Sessions
          h4.mb-3 Revoke All User Sessions
          form(@submit.prevent="handleRevokeUserSessions")
            .flex.flex-col.gap-2
              label(for="revokeAllUserId") User
              USelect#revokeAllUserId(v-model="revokeAllSessionsUserId" :items="userSelectOptions" value-key="id" label-key="displayLabel" placeholder="Select a User" required)
              UButton(type="submit" label="Revoke All" color="error" :disabled="authAdminStore.isLoading" class="mt-2")

      // --- Impersonation ---
      UCard
        template(#title) Impersonation
        div
          div(v-if="authStore.isImpersonating")
            UAlert(color="warning" variant="subtle" icon="i-lucide-user-round")
              | You are currently impersonating {{ authStore.user?.name }} ({{ authStore.user?.email }}).
            UButton(@click="handleStopImpersonating" label="Stop Impersonating" color="error" class="mt-3")
          div(v-else)
            h4.mb-3 Impersonate User
            form(@submit.prevent="handleImpersonateUser")
              .flex.flex-col.gap-2
                label(for="impersonateUserId") User
                USelect#impersonateUserId(v-model="impersonateUserId" :items="userSelectOptions" value-key="id" label-key="displayLabel" placeholder="Select a User" required)
                UButton(type="submit" label="Impersonate User" color="warning" :disabled="authAdminStore.isLoading" class="mt-2")
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useAuthStore } from '@/stores/betterAuth'
import { useAuthAdminStore } from '@/stores/betterAuthAdmin'
import type { User } from '@/stores/betterAuth'

const authStore = useAuthStore()
const authAdminStore = useAuthAdminStore()

// --- Form & Data State ---
const usersList = ref<User[]>([])
const userSessionsList = ref<any[]>([])

const newUserForm = ref({ name: '', email: '', password: '', role: '' })
const updateUserForm = ref({ id: '', name: '', role: '', password: '' })
const removeUserId = ref('')

const setRoleForm = ref({ userId: '', role: '' })
const banUserForm = ref({ userId: '', banReason: '', banExpiresIn: undefined as number | undefined })
const unbanUserId = ref('')

const listSessionsUserId = ref('')
const revokeAllSessionsUserId = ref('')

const impersonateUserId = ref('')

// --- Table State ---
const userSorting = ref([])
const userPagination = ref({ pageIndex: 0, pageSize: 10 })
const usersPage = computed({
  get: () => userPagination.value.pageIndex + 1,
  set: (val: number) => { userPagination.value = { ...userPagination.value, pageIndex: val - 1 } },
})

// --- Table Column Defs ---
const userColumns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'banned', header: 'Banned' },
]

const sessionColumns = [
  { accessorKey: 'id', header: 'Session ID' },
  { accessorKey: 'createdAt', header: 'Created At' },
  { accessorKey: 'expiresAt', header: 'Expires At' },
  { accessorKey: 'ipAddress', header: 'IP Address' },
  { id: 'actions', header: 'Actions', enableHiding: false },
]

// --- Computed Properties ---
const userSelectOptions = computed(() => {
  return usersList.value.map(user => ({
    ...user,
    displayLabel: `${user.name} <${user.email}>`
  }))
})

// --- Action Handlers ---
async function handleCreateUser() {
  try {
    await authAdminStore.createUser(newUserForm.value)
    // Clear form on success
    newUserForm.value = { name: '', email: '', password: '', role: '' }
    // Refresh user list
    await handleListUsers()
  } catch (error) {
    // Error is handled by the store
  }
}

async function handleListUsers() {
  try {
    const data = await authAdminStore.listUsers()
    usersList.value = data.users || []
  } catch (error) {
    usersList.value = []
  }
}

async function handleUpdateUser() {
  if (!updateUserForm.value.id) return
  try {
    const updateData: Record<string, any> = {}
    if (updateUserForm.value.name) updateData.name = updateUserForm.value.name
    if (updateUserForm.value.role) updateData.role = updateUserForm.value.role

    if (Object.keys(updateData).length > 0) {
      await authAdminStore.updateUser(updateUserForm.value.id, updateData)
    }

    if (updateUserForm.value.password) {
      await authAdminStore.setUserPassword(updateUserForm.value.id, updateUserForm.value.password)
    }

    updateUserForm.value = { id: '', name: '', role: '', password: '' }
    await handleListUsers()
  } catch (error) {}
}

async function handleRemoveUser() {
  if (!removeUserId.value) return
  if (!confirm(`Are you sure you want to remove user ${removeUserId.value}? This action cannot be undone.`)) return
  try {
    await authAdminStore.removeUser(removeUserId.value)
    removeUserId.value = ''
    await handleListUsers()
  } catch (error) {}
}

async function handleSetRole() {
  if (!setRoleForm.value.userId) return
  try {
    await authAdminStore.setRole(setRoleForm.value.userId, setRoleForm.value.role)
    setRoleForm.value = { userId: '', role: '' }
    await handleListUsers()
  } catch (error) {}
}

async function handleBanUser() {
  if (!banUserForm.value.userId) return
  try {
    await authAdminStore.banUser(banUserForm.value.userId, banUserForm.value.banReason, banUserForm.value.banExpiresIn)
    banUserForm.value = { userId: '', banReason: '', banExpiresIn: undefined }
    await handleListUsers()
  } catch (error) {}
}

async function handleUnbanUser() {
  if (!unbanUserId.value) return
  try {
    await authAdminStore.unbanUser(unbanUserId.value)
    unbanUserId.value = ''
    await handleListUsers()
  } catch (error) {}
}

async function handleListUserSessions() {
  if (!listSessionsUserId.value) return
  try {
    const data = await authAdminStore.listUserSessions(listSessionsUserId.value)
    userSessionsList.value = data.sessions || []
  } catch (error) {
    userSessionsList.value = []
  }
}

async function handleRevokeUserSession(sessionToken: string) {
  try {
    await authAdminStore.revokeUserSession(sessionToken)
    // Refresh the list
    await handleListUserSessions()
  } catch (error) {}
}

async function handleRevokeUserSessions() {
  if (!revokeAllSessionsUserId.value) return
  if (!confirm(`Are you sure you want to revoke all sessions for user ${revokeAllSessionsUserId.value}?`)) return
  try {
    await authAdminStore.revokeUserSessions(revokeAllSessionsUserId.value)
    revokeAllSessionsUserId.value = ''
    userSessionsList.value = []
  } catch (error) {}
}

async function handleImpersonateUser() {
  if (!impersonateUserId.value) return
  try {
    await authAdminStore.impersonateUser(impersonateUserId.value)
    impersonateUserId.value = ''
  } catch (error) {}
}

async function handleStopImpersonating() {
  try {
    await authAdminStore.stopImpersonating()
  } catch (error) {}
}

// Load initial data
// TODO fix timing, this is running before the stores are initialized, so can't check for isAdmin
onMounted(() => {
  if (authStore.isAdmin) {
    handleListUsers()
  }
})
</script>
