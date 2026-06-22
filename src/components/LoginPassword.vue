<template lang="pug">
// This component handles Login, Sign Up, and Forgot Password forms.
.auth-panel.flex.flex-col.gap-4.items-center.justify-center.p-4.py-12.rounded-lg.shadow-md.w-full.max-w-md(class="bg-white dark:bg-slate-400")
  // Login Form
  div(v-if="currentView === 'login'")
    h2.text-2xl.font-bold.text-gray-700.mb-6.text-center Login
    form(@submit.prevent="handleLogin")
      .mb-4
        label.block.text-gray-700.text-sm.font-bold.mb-2(for="email") Email
        InputText#email.w-full.px-3.py-2.border.rounded-lg(
          type="email"
          v-model="email"
          placeholder="Enter your email"
          required
          class="focus:outline-none focus:ring-2 focus:ring-blue-500"
        )
      .mb-6
        label.block.text-gray-700.text-sm.font-bold.mb-2(for="password") Password
        InputText#password.w-full.px-3.py-2.border.rounded-lg(
          type="password"
          v-model="password"
          placeholder="Enter your password"
          required
          class="focus:outline-none focus:ring-2 focus:ring-blue-500"
        )
      .flex.items-center.justify-between.mb-4
        .flex.items-center
          InputText#remember.me-2.h-4.w-4.text-blue-600(
            type="checkbox"
            v-model="rememberMe"
            class="focus:ring-blue-500 border-gray-300 rounded"
          )
          label.text-sm.text-gray-600(for="remember") Remember me
        a.text-sm.text-blue-600.cursor-pointer(@click.prevent="switchView('forgot')" class="hover:underline") Forgot password?
      Button.w-full.bg-blue-600.text-white.font-bold.py-2.px-4.rounded-lg(
        label="Login"
        type="submit"
        :disabled="authStore.isLoading"
        :loading="authStore.isLoading"
        class="hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      )
      .mt-4.text-center.text-sm.text-gray-600
        span Don't have an account?
        a.text-blue-600.ml-1.cursor-pointer(@click.prevent="switchView('signup')" class="hover:underline") Sign up

  // Sign Up Form
  div(v-else-if="currentView === 'signup'")
    h2.text-2xl.font-bold.text-gray-700.mb-6.text-center Sign Up
    form(@submit.prevent="handleSignUp")
      .mb-4
        label.block.text-gray-700.text-sm.font-bold.mb-2(for="name") Name
        InputText#name.w-full.px-3.py-2.border.rounded-lg(
          v-model="name"
          type="text"
          placeholder="Enter your full name"
          required
          class="focus:outline-none focus:ring-2 focus:ring-blue-500"
        )
      .mb-4
        label.block.text-gray-700.text-sm.font-bold.mb-2(for="signup-email") Email
        InputText#signup-email.w-full.px-3.py-2.border.rounded-lg(
          v-model="email"
          type="email"
          placeholder="Enter your email"
          required
          class="focus:outline-none focus:ring-2 focus:ring-blue-500"
        )
      .mb-6
        label.block.text-gray-700.text-sm.font-bold.mb-2(for="signup-password") Password
        InputText#signup-password.w-full.px-3.py-2.border.rounded-lg(
          v-model="password"
          type="password"
          placeholder="Create a password"
          required
          class="focus:outline-none focus:ring-2 focus:ring-blue-500"
        )
      Button.w-full.bg-green-600.text-white.font-bold.py-2.px-4.rounded-lg(
        label="Sign Up"
        type="submit"
        :disabled="authStore.isLoading"
        :loading="authStore.isLoading"
        class="hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      )
      .mt-4.text-center.text-sm.text-gray-600
        span Already have an account?
        a.text-blue-600.ml-1.cursor-pointer(@click.prevent="switchView('login')" class="hover:underline") Login

  // Forgot Password Form
  div(v-else-if="currentView === 'forgot'")
    h2.text-2xl.font-bold.text-gray-700.mb-6.text-center Forgot Password
    p.text-gray-600.mb-6.text-center Enter your email address and we will send you a link to reset your password.
    form(@submit.prevent="handleForgotPassword")
      .mb-6
        label.block.text-gray-700.text-sm.font-bold.mb-2(for="forgot-email") Email
        InputText#forgot-email.w-full.px-3.py-2.border.rounded-lg(
          v-model="email"
          type="email"
          placeholder="Enter your email"
          required
          class="focus:outline-none focus:ring-2 focus:ring-blue-500"
        )
      Button.w-full.bg-orange-600.text-white.font-bold.py-2.px-4.rounded-lg(
        label="Send Reset Email"
        type="submit"
        :disabled="authStore.isLoading"
        :loading="authStore.isLoading"
        class="hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      )
      .mt-4.text-center.text-sm.text-gray-600
        a.text-blue-600.cursor-pointer(@click.prevent="switchView('login')" class="hover:underline") Back to Login

  // Success Message Display
  .mt-4(v-if="successMessage")
    .p-3.bg-green-100.text-green-700.rounded-lg.text-sm {{ successMessage }}

  // Error Display
  .mt-4(v-if="authStore.error")
    .p-3.bg-red-100.text-red-700.rounded-lg.text-sm {{ authStore.error }}
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/betterAuth'

const authStore = useAuthStore()
const router = useRouter()

// Form state
const email = ref('')
const password = ref('')
const name = ref('') // For sign up
const rememberMe = ref(false)
const successMessage = ref<string | null>(null)

// View management
type AuthView = 'login' | 'signup' | 'forgot'
const currentView = ref<AuthView>('login')

function clearMessages() {
  authStore.error = null
  successMessage.value = null
}

function switchView(view: AuthView) {
  currentView.value = view
  // Clear errors and success messages when switching views
  clearMessages()
}

// --- Handlers ---
const handleLogin = async () => {
  clearMessages()
  try {
    await authStore.loginWithEmailPassword({
      email: email.value,
      password: password.value,
      remember: rememberMe.value
    })
    successMessage.value = 'Login successful! Redirecting...'
    await router.push('/')
  } catch (error) {
    console.error('Login component caught error:', error)
    // Error is already set in the store
  }
}

const handleSignUp = async () => {
  clearMessages()
  try {
    await authStore.signUpWithEmailPassword({
      name: name.value,
      email: email.value,
      password: password.value
    })
    successMessage.value = 'Sign up successful! Please check your email to verify your account, then log in.'
    switchView('login')
  } catch (error) {
    console.error('Sign up component caught error:', error)
    // Error is already set in the store
  }
}

const handleForgotPassword = async () => {
  clearMessages()
  try {
    await authStore.requestPasswordReset(email.value)
    successMessage.value = 'If an account with that email exists, a password reset link has been sent.'
  } catch (error) {
    console.error('Forgot password component caught error:', error)
    // Error is already set in the store
  }
}
</script>
