<route>
meta:
  title: User Management
</route>

<template lang="pug">
div.container.mx-auto.p-4
  // --- Authorization Gates ---
  div(v-if="!authStore.isAuthenticated")
    Card
      template(#content) Please log in to view this page.
  div(v-else-if="!authStore.isAdmin")
    Card
      template(#content)
        .text-red-600.font-bold You do not have administrator privileges to access this page.
  div(v-else)
    // --- Global Loading & Error Display ---
    Message(v-if="authAdminStore.error" severity="error" :closable="false") {{ authAdminStore.error }}
    ProgressBar(v-if="authAdminStore.isLoading" mode="indeterminate" style="height: 6px" )

    .grid.grid-cols-1.gap-6.mt-4(class="lg:grid-cols-2")
      // --- User Management ---
      Card
        template(#title) User Management
        template(#content)
          // Create User Form
          h4.mb-3 Create User
          form(@submit.prevent="handleCreateUser")
            .flex.flex-col.gap-2
              label(for="newUserName") Name
              InputText#newUserName(v-model="newUserForm.name" required)
              label(for="newUserEmail") Email
              InputText#newUserEmail(type="email" v-model="newUserForm.email" required)
              label(for="newUserPassword") Password
              Password#newUserPassword(v-model="newUserForm.password" :feedback="false" required)
              label(for="newUserRole") Role (optional, comma-separated)
              InputText#newUserRole(v-model="newUserForm.role" placeholder="e.g., user,editor")
              Button(type="submit" label="Create User" :disabled="authAdminStore.isLoading" class="mt-2")

          Divider

          // List Users
          h4.mb-3 All Users
              Button(label="Refresh List" @click="handleListUsers" :disabled="authAdminStore.isLoading")
              DataTable(:value="usersList" :paginator="true" :rows="10" responsiveLayout="scroll" class="mt-3")
                Column(field="id" header="ID" :sortable="true")
                Column(field="name" header="Name" :sortable="true")
                Column(field="email" header="Email" :sortable="true")
                Column(field="role" header="Role" :sortable="true")
                Column(field="banned" header="Banned" :sortable="true")
                  template(#body="slotProps")
                    Tag(v-if="slotProps.data.banned" severity="danger" value="Yes")
                    Tag(v-else severity="success" value="No")

          Divider

          // Update User
          h4.mb-3 Update User
          form(@submit.prevent="handleUpdateUser")
            .flex.flex-col.gap-2
              label(for="updateUserId") User
              Select#updateUserId(v-model="updateUserForm.id" :options="userSelectOptions" optionLabel="displayLabel" optionValue="id" placeholder="Select a User" :filter="true" required)
              label(for="updateUserName") New Name
              InputText#updateUserName(v-model="updateUserForm.name")
              label(for="updateUserRole") New Role (comma-separated)
              InputText#updateUserRole(v-model="updateUserForm.role" placeholder="e.g., user,editor")
              label(for="updateUserPassword") New Password
              Password#updateUserPassword(v-model="updateUserForm.password" :feedback="false")
              Button(type="submit" label="Update User" :disabled="authAdminStore.isLoading" class="mt-2")

          Divider

          // Delete User
          h4.mb-3 Remove User
          form(@submit.prevent="handleRemoveUser")
            .flex.flex-col.gap-2
              label(for="removeUserId") User
              Select#removeUserId(v-model="removeUserId" :options="userSelectOptions" optionLabel="displayLabel" optionValue="id" placeholder="Select a User" :filter="true" required)
              Button(type="submit" label="Remove User" severity="danger" :disabled="authAdminStore.isLoading" class="mt-2")

      // --- Role Management ---
      Card
        template(#title) Role Management
        template(#content)
          // Set Role
          h4.mb-3 Set User Role
          form(@submit.prevent="handleSetRole")
            .flex.flex-col.gap-2
              label(for="setRoleUserId") User
              Select#setRoleUserId(v-model="setRoleForm.userId" :options="userSelectOptions" optionLabel="displayLabel" optionValue="id" placeholder="Select a User" :filter="true" required)
              label(for="setRoleValue") New Role (comma-separated)
              InputText#setRoleValue(v-model="setRoleForm.role" required)
              Button(type="submit" label="Set Role" :disabled="authAdminStore.isLoading" class="mt-2")

      // --- Ban Management ---
      Card
        template(#title) Ban Management
        template(#content)
          // Ban User
          h4.mb-3 Ban User
          form(@submit.prevent="handleBanUser")
            .flex.flex-col.gap-2
              label(for="banUserId") User
              Select#banUserId(v-model="banUserForm.userId" :options="userSelectOptions" optionLabel="displayLabel" optionValue="id" placeholder="Select a User" :filter="true" required)
              label(for="banReason") Reason (optional)
              InputText#banReason(v-model="banUserForm.banReason")
              label(for="banExpires") Expires In (seconds, optional)
              InputNumber#banExpires(v-model="banUserForm.banExpiresIn" :useGrouping="false")
              Button(type="submit" label="Ban User" severity="warning" :disabled="authAdminStore.isLoading" class="mt-2")

          Divider

          // Unban User
          h4.mb-3 Unban User
          form(@submit.prevent="handleUnbanUser")
            .flex.flex-col.gap-2
              label(for="unbanUserId") User
              Select#unbanUserId(v-model="unbanUserId" :options="userSelectOptions" optionLabel="displayLabel" optionValue="id" placeholder="Select a User" :filter="true" required)
              Button(type="submit" label="Unban User" :disabled="authAdminStore.isLoading" class="mt-2")

      // --- Session Management ---
      Card
        template(#title) Session Management
        template(#content)
          // List User Sessions
          h4.mb-3 List User Sessions
          form(@submit.prevent="handleListUserSessions")
            .flex.flex-col.gap-2
              label(for="listSessionsUserId") User
              Select#listSessionsUserId(v-model="listSessionsUserId" :options="userSelectOptions" optionLabel="displayLabel" optionValue="id" placeholder="Select a User" :filter="true" required)
              Button(type="submit" label="List Sessions" :disabled="authAdminStore.isLoading" class="mt-2")
          DataTable(v-if="userSessionsList.length > 0" :value="userSessionsList" responsiveLayout="scroll" class="mt-3")
            Column(field="id" header="Session ID")
            Column(field="createdAt" header="Created At")
            Column(field="expiresAt" header="Expires At")
            Column(field="ipAddress" header="IP Address")
            Column(header="Actions")
              template(#body="slotProps")
                Button(@click="handleRevokeUserSession(slotProps.data.token)" label="Revoke" size="small" severity="danger")

          Divider

          // Revoke All User Sessions
          h4.mb-3 Revoke All User Sessions
          form(@submit.prevent="handleRevokeUserSessions")
            .flex.flex-col.gap-2
              label(for="revokeAllUserId") User
              Select#revokeAllUserId(v-model="revokeAllSessionsUserId" :options="userSelectOptions" optionLabel="displayLabel" optionValue="id" placeholder="Select a User" :filter="true" required)
              Button(type="submit" label="Revoke All" severity="danger" :disabled="authAdminStore.isLoading" class="mt-2")

      // --- Impersonation ---
      Card
        template(#title) Impersonation
        template(#content)
          div(v-if="authStore.isImpersonating")
            Message(severity="warn" :closable="false") You are currently impersonating {{ authStore.user?.name }} ({{ authStore.user?.email }}).
            Button(@click="handleStopImpersonating" label="Stop Impersonating" severity="danger" class="mt-3")
          div(v-else)
            h4.mb-3 Impersonate User
            form(@submit.prevent="handleImpersonateUser")
              .flex.flex-col.gap-2
                label(for="impersonateUserId") User
                Select#impersonateUserId(v-model="impersonateUserId" :options="userSelectOptions" optionLabel="displayLabel" optionValue="id" placeholder="Select a User" :filter="true" required)
                Button(type="submit" label="Impersonate User" severity="warning" :disabled="authAdminStore.isLoading" class="mt-2")
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
const banUserForm = ref({ userId: '', banReason: '', banExpiresIn: undefined })
const unbanUserId = ref('')

const listSessionsUserId = ref('')
const revokeAllSessionsUserId = ref('')

const impersonateUserId = ref('')

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

<style scoped>
/* Add any specific styles here if needed, though Tailwind/PrimeVue should cover most */
.p-divider {
  margin: 1.5rem 0;
}
</style>
