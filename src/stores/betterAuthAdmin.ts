import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createAuthClient } from 'better-auth/client'
import { adminClient } from 'better-auth/client/plugins'
import { useAuthStore } from '@/stores/betterAuth'
//import type { User, Session } from '@/stores/betterAuth'

// Define the base URL for your Better Auth API endpoint.
// This should be configured based on your environment (e.g., via .env file).
const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_URL,
  plugins: [
    adminClient(),
  ],
})

export const useAuthAdminStore = defineStore('betterAuthAdmin', () => {
  // --- State ---
  const authStore = useAuthStore()
  const isReady = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // --- Getters ---

  // --- Helpers ---
  const isAuthenticated = computed(() => !!authStore.user)
  const isAdmin = computed(() => !!authStore?.isAdmin)

  // --- Actions ---

  async function createUser(userData: {
    email: string
    password: string
    name: string
    role?: string
    data?: Record<string, any>
  }) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      const { data, error: apiError } = await authClient.admin.createUser(userData)
      if (apiError) {
        throw new Error(apiError.message || 'Failed to create user.')
      }
      return data
    } catch (e: any) {
      console.error('Create user failed:', e)
      error.value = e?.message || 'Failed to create user.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function listUsers(query?: {
    searchValue?: string
    searchField?: 'name' | 'email'
    searchOperator?: 'contains' | 'starts_with' | 'ends_with'
    limit?: number | string
    offset?: number | string
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
    filterField?: string
    filterValue?: string | number | boolean
    filterOperator?: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'
  }) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      const { data, error: apiError } = await authClient.admin.listUsers({ query: query as any })
      if (apiError) {
        throw new Error(apiError.message || 'Failed to list users.')
      }
      return data
    } catch (e: any) {
      console.error('List users failed:', e)
      error.value = e?.message || 'Failed to list users.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function setRole(userId: string, role: string | string[]) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      const { data, error: apiError } = await authClient.admin.setRole({ userId, role: role as any })
      if (apiError) {
        throw new Error(apiError.message || 'Failed to set role.')
      }
      return data
    } catch (e: any) {
      console.error('Set role failed:', e)
      error.value = e?.message || 'Failed to set role.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function setUserPassword(userId: string, newPassword: string) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      const { data, error: apiError } = await authClient.admin.setUserPassword({ userId, newPassword })
      if (apiError) {
        throw new Error(apiError.message || 'Failed to set user password.')
      }
      return data
    } catch (e: any) {
      console.error('Set user password failed:', e)
      error.value = e?.message || 'Failed to set user password.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function updateUser(userId: string, data: Record<string, any>) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      const { data: updatedUser, error: apiError } = await authClient.admin.updateUser({ userId, data })
      if (apiError) {
        throw new Error(apiError.message || 'Failed to update user.')
      }
      return updatedUser
    } catch (e: any) {
      console.error('Update user failed:', e)
      error.value = e?.message || 'Failed to update user.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function removeUser(userId: string) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      const { data, error: apiError } = await authClient.admin.removeUser({ userId })
      if (apiError) {
        throw new Error(apiError.message || 'Failed to remove user.')
      }
      return data
    } catch (e: any) {
      console.error('Remove user failed:', e)
      error.value = e?.message || 'Failed to remove user.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function banUser(
    userId: string,
    banReason?: string,
    banExpiresIn?: number /* in seconds; if not provided, never expires */
  ) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      // The return type for banUser is void, but we still handle potential errors
      await authClient.admin.banUser({ userId, banReason, banExpiresIn })
    } catch (e: any) {
      console.error('Ban user failed:', e)
      error.value = e?.message || 'Failed to ban user.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function unbanUser(userId: string) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      await authClient.admin.unbanUser({ userId })
    } catch (e: any) {
      console.error('Unban user failed:', e)
      error.value = e?.message || 'Failed to unban user.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function listUserSessions(userId: string) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      const { data, error: apiError } = await authClient.admin.listUserSessions({ userId })
      if (apiError) {
        throw new Error(apiError.message || 'Failed to list user sessions.')
      }
      return data
    } catch (e: any) {
      console.error('List user sessions failed:', e)
      error.value = e?.message || 'Failed to list user sessions.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function revokeUserSession(sessionToken: string) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      const { data, error: apiError } = await authClient.admin.revokeUserSession({ sessionToken })
      if (apiError) {
        throw new Error(apiError.message || 'Failed to revoke user session.')
      }
      return data
    } catch (e: any) {
      console.error('Revoke user session failed:', e)
      error.value = e?.message || 'Failed to revoke user session.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function revokeUserSessions(userId: string) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      const { data, error: apiError } = await authClient.admin.revokeUserSessions({ userId })
      if (apiError) {
        throw new Error(apiError.message || 'Failed to revoke user sessions.')
      }
      return data
    } catch (e: any) {
      console.error('Revoke user sessions failed:', e)
      error.value = e?.message || 'Failed to revoke user sessions.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function impersonateUser(userId: string) {
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Admin access required.')
    }
    isLoading.value = true
    error.value = null
    try {
      const { data, error: apiError } = await authClient.admin.impersonateUser({ userId })
      if (apiError) {
        throw new Error(apiError.message || 'Failed to impersonate user.')
      }
      // After impersonating, we need to re-initialize the main auth store
      await authStore.initialize(true)
      return data
    } catch (e: any) {
      console.error('Impersonate user failed:', e)
      error.value = e?.message || 'Failed to impersonate user.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  async function stopImpersonating() {
    if (!authStore.isImpersonating) {
      // Not impersonating, so nothing to do.
      return
    }
    isLoading.value = true
    error.value = null
    try {
      await authClient.admin.stopImpersonating()
      // After stopping, re-initialize the main auth store to get the original user back
      await authStore.initialize(true)
    } catch (e: any) {
      console.error('Stop impersonating failed:', e)
      error.value = e?.message || 'Failed to stop impersonating.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  onMounted(()=> {
    // TODO make sure the authStore is ready, too, before saying we're ready
    isReady.value = true
  })

  return {
    // State
    //authStore,
    isReady,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    isAdmin,
    // Actions
    createUser,
    listUsers,
    setRole,
    setUserPassword,
    updateUser,
    removeUser,
    banUser,
    unbanUser,
    listUserSessions,
    revokeUserSession,
    revokeUserSessions,
    impersonateUser,
    stopImpersonating,
  }
})
