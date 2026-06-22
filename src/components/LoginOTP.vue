<template lang="pug">
.auth-panel.flex.flex-col.gap-4.items-center.justify-center.p-4.py-12.rounded-lg.shadow-md.w-full.max-w-md(class="bg-white dark:bg-slate-400")
  // Step 1: Enter Email to Send OTP
  template(v-if="currentStep === 'email'")
    h2.text-2xl.font-bold.text-gray-700.mb-6.text-center Sign in with OTP
    p.text-gray-600.mb-6.text-center Enter your email address and we'll send you a one-time password.
    form(@submit.prevent="handleSendOtp")
      .mb-6
        label.block.text-gray-700.text-sm.font-bold.mb-2(for="otp-email") Email
        InputText#otp-email.w-full.px-3.py-2.border.rounded-lg(
          v-model="email"
          type="email"
          placeholder="Enter your email"
          required
          class="focus:outline-none focus:ring-2 focus:ring-blue-500"
        )
      Button.w-full.bg-blue-600.text-white.font-bold.py-2.px-4.rounded-lg(
        label="Send OTP"
        type="submit"
        :loading="authStore.isLoading"
        :disabled="authStore.isLoading"
        class="hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      )

  // Step 2: Enter OTP to Sign In
  template(v-else-if="currentStep === 'otp'")
    h2.text-2xl.font-bold.text-gray-700.mb-6.text-center Enter OTP
    p.text-gray-600.mb-6.text-center Enter the 6-digit code sent to {{ email }}
    form(@submit.prevent="handleSignInOtp")
      .mb-6
        label.block.text-gray-700.text-sm.font-bold.mb-2(for="otp-code") One-Time Password
        // TODO replace with text field so it can auto-focus?
        InputOtp#otp-code.w-full(
          v-model="otp"
          :length="6"
          integer-only
          autofocus-is-missing-from-this-component
          :this-doesnt-work-either--pt="{ input: (context)=> ({ autofocus: context.props.id === 0 })}"
          @change="(e)=> { e.value?.length === 6 && handleSignInOtp() }"
        )
      .flex.items-center.justify-between.mb-4
        span.text-sm.text-gray-600 Didn't receive the code?
        Button.text-sm.text-blue-600.cursor-pointer(
          @click.prevent="handleResendOtp"
          :disabled="resendDisabled"
          class="hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
        )
          span(v-if="!resendDisabled") Resend OTP
          span(v-else) Resend in {{ countdown }}s
      Button.w-full.bg-blue-600.text-white.font-bold.py-2.px-4.rounded-lg(
        label="Sign In"
        type="submit"
        :loading="authStore.isLoading"
        :disabled="authStore.isLoading || otp.length !== 6"
        class="hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      )
      .mt-4.text-center
        Button.text-sm.text-gray-600.cursor-pointer(
          label="Back to Change Email"
          severity="secondary"
          variant="text"
          @click.prevent="resetForm"
          class="underline"
        )

  // Success Message Display
  .mt-4(v-if="successMessage")
    Message(severity="success") {{ successMessage }}

  // Error Display
  .mt-4(v-if="authStore.error")
    Message(severity="error") {{ authStore.error }}
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/betterAuth'
import InputOtp from 'primevue/inputotp'
import Message from 'primevue/message'

const authStore = useAuthStore()
const router = useRouter()

// Form state
const email = ref('')
const otp = ref('')
const successMessage = ref<string | null>(null)

// Step management
type AuthStep = 'email' | 'otp'
const currentStep = ref<AuthStep>('email')

// Resend countdown
const resendDisabled = ref(false)
const countdown = ref(30)
let countdownInterval: ReturnType<typeof setInterval> | null = null

function clearMessages() {
  authStore.error = null
  successMessage.value = null
}

function resetForm() {
  currentStep.value = 'email'
  email.value = ''
  otp.value = ''
  clearMessages()
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  resendDisabled.value = false
  countdown.value = 30
}

function startCountdown() {
  resendDisabled.value = true
  countdown.value = 30
  countdownInterval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      resendDisabled.value = false
      if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
    }
  }, 1000)
}

// --- Handlers ---
const handleSendOtp = async () => {
  clearMessages()
  try {
    await authStore.sendVerificationOtp({
      email: email.value,
      type: 'sign-in'
    })
    successMessage.value = 'OTP sent successfully! Please check your email.'
    currentStep.value = 'otp'
    startCountdown()
  } catch (error) {
    console.error('Send OTP component caught error:', error)
    // Error is already set in the store
  }
}

const handleSignInOtp = async () => {
  clearMessages()
  try {
    await authStore.signInWithOtp({
      email: email.value,
      otp: otp.value
    })
    successMessage.value = 'Sign in successful! Redirecting...'
    await router.push('/')
  } catch (error) {
    console.error('Sign in with OTP component caught error:', error)
    // Error is already set in the store
  }
}

const handleResendOtp = async () => {
  clearMessages()
  try {
    await authStore.sendVerificationOtp({
      email: email.value,
      type: 'sign-in'
    })
    successMessage.value = 'New OTP sent successfully!'
    startCountdown()
  } catch (error) {
    console.error('Resend OTP component caught error:', error)
    // Error is already set in the store
  }
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
