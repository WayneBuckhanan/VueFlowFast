<template lang="pug">
UCard.w-full.max-w-md(:ui="{ root: 'rounded-lg shadow-md' }")
  // Step 1: Enter Email to Send OTP
  template(v-if="currentStep === 'email'")
    h2.text-2xl.font-bold.mb-6.text-center Sign in with OTP
    p.text-muted.mb-6.text-center Enter your email address and we'll send you a one-time password.
    form.flex.flex-col.gap-6(@submit.prevent="handleSendOtp")
      UFormField(label="Email" name="email")
        UInput.w-full(
          v-model="email"
          type="email"
          placeholder="Enter your email"
          autofocus
          required
        )
      UButton.w-full.justify-center(
        label="Send OTP"
        type="submit"
        block
        :loading="authStore.isLoading"
        :disabled="authStore.isLoading"
      )

  // Step 2: Enter OTP to Sign In
  template(v-else-if="currentStep === 'otp'")
    h2.text-2xl.font-bold.mb-6.text-center Enter OTP
    p.text-muted.mb-6.text-center Enter the 6-digit code sent to {{ email }}
    form.flex.flex-col.gap-6(@submit.prevent="handleSignInOtp")
      UFormField.flex.flex-col.items-center(label="One-Time Password" name="otp")
        UPinInput(
          v-model="otp"
          :length="6"
          type="number"
          otp
          autofocus
          @complete="handleSignInOtp"
        )
      .flex.items-center.justify-between
        span.text-sm.text-muted Didn't receive the code?
        UButton(
          :label="resendDisabled ? `Resend in ${countdown}s` : 'Resend OTP'"
          variant="link"
          size="sm"
          :disabled="resendDisabled"
          @click.prevent="handleResendOtp"
        )
      UButton.w-full.justify-center(
        label="Sign In"
        type="submit"
        block
        :loading="authStore.isLoading"
        :disabled="authStore.isLoading || otp.join('').length !== 6"
      )
      UButton.w-full.justify-center(
        label="Back to Change Email"
        type="button"
        color="neutral"
        variant="link"
        @click.prevent="resetForm"
      )

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
const otp = ref<string[]>([])
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
  otp.value = []
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
  if (otp.value.join('').length !== 6) return
  clearMessages()
  try {
    await authStore.signInWithOtp({
      email: email.value,
      otp: otp.value.join('')
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
