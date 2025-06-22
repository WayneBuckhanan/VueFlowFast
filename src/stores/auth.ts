// src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'

export interface User {
  id: string
  email: string
  createdAt: string
  lastLoginAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginResponse {
  success: boolean
  message?: string
  error?: string
  code?: string
}

export interface VerifyResponse {
  success: boolean
  user?: User
  message?: string
  error?: string
  code?: string
}

export interface LogoutResponse {
  success: boolean
  message?: string
  error?: string
}

export interface MeResponse {
  success: boolean
  user?: User
  error?: string
  code?: string
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const isAuthenticated = computed(() => !!user.value)

  // Actions
  const clearError = () => {
    error.value = null
  }

  const setError = (message: string) => {
    error.value = message
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setUser = (userData: User | null) => {
    user.value = userData
  }

  /**
   * Send verification code to email
   */
  const login = async (email: string): Promise<LoginResponse> => {
    setLoading(true)
    clearError()

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ email }),
      })

      const data: LoginResponse = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to send verification code')
        return data
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Verify code and authenticate user
   */
  const verifyCode = async (email: string, code: string): Promise<VerifyResponse> => {
    setLoading(true)
    clearError()

    try {
      const response = await fetch('/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ email, code }),
      })

      const data: VerifyResponse = await response.json()

      if (!data.success) {
        setError(data.error || 'Invalid verification code')
        return data
      }

      // Set user data on successful verification
      if (data.user) {
        setUser(data.user)
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Logout user and clear session
   */
  const logout = async (): Promise<LogoutResponse> => {
    setLoading(true)
    clearError()

    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      })

      const data: LogoutResponse = await response.json()

      // Clear user data regardless of response
      setUser(null)

      if (!data.success) {
        setError(data.error || 'Logout failed')
        return data
      }

      return data
    } catch (err) {
      // Clear user data even if logout request fails
      setUser(null)
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Get current user information
   */
  const getCurrentUser = async (): Promise<MeResponse> => {
    setLoading(true)
    clearError()

    try {
      const response = await fetch('/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      })

      const data: MeResponse = await response.json()

      if (!data.success) {
        // If session is invalid, clear user data
        if (data.code === 'NO_TOKEN' || data.code === 'INVALID_SESSION') {
          setUser(null)
        }
        setError(data.error || 'Failed to get user information')
        return data
      }

      // Set user data on successful response
      if (data.user) {
        setUser(data.user)
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Initialize auth state on app startup
   */
  const initialize = async (): Promise<void> => {
    await getCurrentUser()
  }

  return {
    // State
    user: readonly(user),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    isAuthenticated,
    
    // Actions
    login,
    verifyCode,
    logout,
    getCurrentUser,
    initialize,
    clearError,
    setError,
  }
})