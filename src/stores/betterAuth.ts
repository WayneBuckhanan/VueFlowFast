import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createAuthClient } from 'better-auth/client'
import { emailOTPClient } from 'better-auth/client/plugins'

// Define the base URL for your Better Auth API endpoint.
// This should be configured based on your environment (e.g., via .env file).
const authClient = createAuthClient({
  baseURL: import.meta.env.BETTER_AUTH_URL,
  plugins: [
    emailOTPClient(),
  ],
})

// Define a basic user type. Adjust this to match your actual user schema from Better Auth.
export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string
  role?: string
  banned: boolean
  banReason?: string
  banExpires?: number
  createdAt: number
  updatedAt: number
}

export interface Session {
	id: string
	expiresAt: number
	token: string
	createdAt: number
	updatedAt: number
	ipAddress?: string
	userAgent?: string
	userId: string
  impersonatedBy: string
}

export const useAuthStore = defineStore('betterAuth', () => {
  // --- State ---
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const isReady = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)
  const isImpersonating = computed(() => !!session.value?.impersonatedBy)
  const isAdmin = computed(() => { return user.value?.role?.split(',')?.map(r => r.trim()).includes('admin') ?? false })

  // --- Actions ---

  /**
   * Initializes the auth store by fetching the current session.
   * This should be called when your app starts.
   */
  async function initialize(override=false) {
    if (isLoading.value && !override) return // Prevent multiple initializations

    isLoading.value = true
    error.value = null
    try {
      const { data: sessionData } = await authClient.getSession()
      session.value = sessionData?.session
      user.value = sessionData?.user
    } catch (e) {
      console.error('Failed to initialize auth session:', e)
      error.value = 'Failed to check authentication status.'
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logs in a user with email and password.
   * @param credentials - The user's email and password.
   */
  async function loginWithEmailPassword(credentials: { email: string; password: string; remember?: boolean }) {
    isLoading.value = true
    error.value = null
    try {
      const { error: authError } = await authClient.signIn.email(credentials)
      if(authError) {
        throw new Error(authError.message || 'Login failed. Please check your credentials and try again.')
      }
      // After successful sign-in, fetch the user session
      await initialize(true)
    } catch (e: any) {
      console.error('Login failed:', e)
      // Better Auth client might throw an error with a message property
      error.value = e?.message || 'Login failed. Please check your credentials and try again.'
      // Re-throw the error so the component can catch it if needed
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Signs up a new user with email and password.
   * @param credentials - The new user's name, email, and password.
   */
  async function signUpWithEmailPassword(credentials: { name: string; email: string; password: string }) {
    isLoading.value = true
    error.value = null
    try {
      await authClient.signUp.email(credentials)
      // Optionally, you can log the user in immediately after signing up
      // await loginWithEmailPassword({ email: credentials.email, password: credentials.password });
    } catch (e: any) {
      console.error('Sign up failed:', e)
      error.value = e?.message || 'Sign up failed. Please try again.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Requests a password reset email for the user.
   * @param email - The user's email address.
   */
  async function requestPasswordReset(email: string) {
    isLoading.value = true
    error.value = null
    try {
      // Assuming the method is `forgetPassword` based on common Better Auth patterns.
      // This might need adjustment based on your specific Better Auth configuration.
      await authClient.forgetPassword({ email })
    } catch (e: any) {
      console.error('Password reset request failed:', e)
      error.value = e?.message || 'Failed to send password reset email.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Sends a verification OTP to the user's email.
   * @param params - The email and OTP type (sign-in or sign-up).
   */
  async function sendVerificationOtp(params: { email: string; type: 'sign-in' | 'sign-up' }) {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: otpError } = await authClient.emailOtp.sendVerificationOtp(params)
      if (otpError) {
        throw new Error(otpError.message || 'Failed to send OTP.')
      }
      return data
    } catch (e: any) {
      console.error('Send OTP failed:', e)
      error.value = e?.message || 'Failed to send OTP. Please try again.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Signs in a user using email and OTP.
   * @param params - The user's email and OTP code.
   */
  async function signInWithOtp(params: { email: string; otp: string }) {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: otpError } = await authClient.signIn.emailOtp(params)
      if (otpError) {
        throw new Error(otpError.message || 'Invalid or expired OTP.')
      }
      // After successful sign-in, fetch the user session
      await initialize(true)
      return data
    } catch (e: any) {
      console.error('Sign in with OTP failed:', e)
      error.value = e?.message || 'Sign in failed. Please check your OTP and try again.'
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logs out the current user.
   */
  async function logout() {
    isLoading.value = true
    error.value = null
    try {
      await authClient.signOut()
      user.value = null
      session.value = null
    } catch (e: any) {
      console.error('Logout failed:', e)
      error.value = e?.message || 'Logout failed.'
    } finally {
      isLoading.value = false
    }
  }

  //onMounted(initialize)
  onMounted(async ()=> {
    await initialize()
    await nextTick()
    isReady.value = true
  })

  return {
    // State
    user, session,
    isReady, isLoading, error,
    // Getters
    isAuthenticated,
    isImpersonating,
    isAdmin,
    // Actions
    initialize,
    loginWithEmailPassword,
    signUpWithEmailPassword,
    requestPasswordReset,
    sendVerificationOtp,
    signInWithOtp,
    logout
  }
})
