<template lang="pug">
// This component handles Login, Sign Up, and Forgot Password forms.
UCard.w-full.max-w-md(:ui="{ root: 'rounded-lg shadow-md' }")
  // Login Form
  div(v-if="currentView === 'login'")
    h2.text-2xl.font-bold.mb-6.text-center Login
    form.flex.flex-col.gap-4(@submit.prevent="handleLogin")
      UFormField(label="Email" name="email")
        UInput.w-full(type="email" v-model="email" placeholder="Enter your email" required)
      UFormField(label="Password" name="password")
        UInput.w-full(type="password" v-model="password" placeholder="Enter your password" required)
      .flex.items-center.justify-between
        UCheckbox(v-model="rememberMe" label="Remember me")
        UButton(
          label="Forgot password?"
          variant="link"
          color="neutral"
          size="sm"
          @click.prevent="switchView('forgot')"
        )
      UButton.w-full.justify-center(
        label="Login"
        type="submit"
        block
        :disabled="authStore.isLoading"
        :loading="authStore.isLoading"
      )
      p.text-center.text-sm.text-muted
        | Don't have an account?
        UButton.ml-1(label="Sign up" variant="link" size="sm" @click.prevent="switchView('signup')")

  // Sign Up Form
  div(v-else-if="currentView === 'signup'")
    h2.text-2xl.font-bold.mb-6.text-center Sign Up
    form.flex.flex-col.gap-4(@submit.prevent="handleSignUp")
      UFormField(label="Name" name="name")
        UInput.w-full(v-model="name" type="text" placeholder="Enter your full name" required)
      UFormField(label="Email" name="signup-email")
        UInput.w-full(v-model="email" type="email" placeholder="Enter your email" required)
      UFormField(label="Password" name="signup-password")
        UInput.w-full(v-model="password" type="password" placeholder="Create a password" required)
      UButton.w-full.justify-center(
        label="Sign Up"
        type="submit"
        color="success"
        block
        :disabled="authStore.isLoading"
        :loading="authStore.isLoading"
      )
      p.text-center.text-sm.text-muted
        | Already have an account?
        UButton.ml-1(label="Login" variant="link" size="sm" @click.prevent="switchView('login')")

  // Forgot Password Form
  div(v-else-if="currentView === 'forgot'")
    h2.text-2xl.font-bold.mb-6.text-center Forgot Password
    p.text-muted.mb-6.text-center Enter your email address and we will send you a link to reset your password.
    form.flex.flex-col.gap-4(@submit.prevent="handleForgotPassword")
      UFormField(label="Email" name="forgot-email")
        UInput.w-full(v-model="email" type="email" placeholder="Enter your email" required)
      UButton.w-full.justify-center(
        label="Send Reset Email"
        type="submit"
        color="warning"
        block
        :disabled="authStore.isLoading"
        :loading="authStore.isLoading"
      )
      p.text-center.text-sm
        UButton(label="Back to Login" variant="link" size="sm" color="neutral" @click.prevent="switchView('login')")

  // Success Message Display
  UAlert.mt-4(
    v-if="successMessage"
    color="success"
    variant="subtle"
    :title="successMessage"
    icon="i-lucide-check-circle"
  )

  // Error Display
  UAlert.mt-4(
    v-if="authStore.error"
    color="error"
    variant="subtle"
    :title="authStore.error"
    icon="i-lucide-alert-circle"
  )
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
