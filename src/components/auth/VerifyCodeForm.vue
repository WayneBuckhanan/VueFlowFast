<template>
  <div class="verify-form">
    <div class="mb-4">
      <h2 class="text-2xl font-bold text-center mb-2">Verify Your Email</h2>
      <p class="text-center text-gray-600">
        Enter the 6-digit code sent to <strong>{{ email }}</strong>
      </p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="field">
        <label for="code" class="block text-sm font-medium mb-2">Verification Code</label>
        <InputText
          id="code"
          v-model="code"
          type="text"
          placeholder="Enter 6-digit code"
          :invalid="!!codeError"
          :disabled="isLoading"
          class="w-full text-center text-lg tracking-widest"
          maxlength="6"
          autocomplete="one-time-code"
          required
          @input="handleCodeInput"
        />
        <small v-if="codeError" class="text-red-500">{{ codeError }}</small>
      </div>

      <div class="flex gap-2">
        <Button
          type="submit"
          :loading="isLoading"
          :disabled="!isCodeValid || isLoading"
          class="flex-1"
          label="Verify Code"
        />
        <Button
          type="button"
          severity="secondary"
          :disabled="isLoading"
          class="flex-1"
          label="Back"
          @click="handleBack"
        />
      </div>

      <Message
        v-if="error"
        severity="error"
        :closable="false"
        class="mt-4"
      >
        {{ error }}
      </Message>

      <div class="text-center mt-4">
        <p class="text-sm text-gray-600">
          Didn't receive the code?
          <Button
            link
            :disabled="isResendDisabled || isLoading"
            class="p-0 text-sm"
            @click="handleResend"
          >
            {{ resendText }}
          </Button>
        </p>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'

// Props
interface Props {
  email: string
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'success', user: any): void
  (e: 'error', error: string): void
  (e: 'back'): void
  (e: 'resend', email: string): void
}

const emit = defineEmits<Emits>()

// Store
const authStore = useAuthStore()

// Reactive state
const code = ref('')
const codeError = ref('')
const resendCountdown = ref(0)
let resendTimer: number | null = null

// Computed
const isLoading = computed(() => authStore.isLoading)
const error = computed(() => authStore.error)

const isCodeValid = computed(() => {
  return code.value && /^\d{6}$/.test(code.value)
})

const isResendDisabled = computed(() => resendCountdown.value > 0)

const resendText = computed(() => {
  if (resendCountdown.value > 0) {
    return `Resend in ${resendCountdown.value}s`
  }
  return 'Resend Code'
})

// Methods
const validateCode = () => {
  codeError.value = ''
  
  if (!code.value) {
    codeError.value = 'Verification code is required'
    return false
  }
  
  if (!/^\d{6}$/.test(code.value)) {
    codeError.value = 'Please enter a valid 6-digit code'
    return false
  }
  
  return true
}

const handleCodeInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  // Only allow digits
  target.value = target.value.replace(/\D/g, '')
  code.value = target.value
}

const handleSubmit = async () => {
  if (!validateCode()) {
    return
  }

  authStore.clearError()

  try {
    const result = await authStore.verifyCode(props.email, code.value)
    
    if (result.success && result.user) {
      emit('success', result.user)
    } else {
      emit('error', result.error || 'Invalid verification code')
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
    emit('error', errorMessage)
  }
}

const handleBack = () => {
  emit('back')
}

const handleResend = async () => {
  if (isResendDisabled.value) {
    return
  }

  emit('resend', props.email)
  startResendCountdown()
}

const startResendCountdown = () => {
  resendCountdown.value = 60 // 60 seconds
  
  resendTimer = setInterval(() => {
    resendCountdown.value--
    if (resendCountdown.value <= 0) {
      clearInterval(resendTimer!)
      resendTimer = null
    }
  }, 1000)
}

// Watch for code changes to clear errors
watch(code, () => {
  if (codeError.value) {
    codeError.value = ''
  }
  authStore.clearError()
})

// Lifecycle
onMounted(() => {
  // Start countdown on mount (assuming code was just sent)
  startResendCountdown()
})

onUnmounted(() => {
  if (resendTimer) {
    clearInterval(resendTimer)
  }
})
</script>

<style scoped>
.verify-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.text-red-500 {
  color: #ef4444;
}

.text-gray-600 {
  color: #6b7280;
}

.tracking-widest {
  letter-spacing: 0.1em;
}
</style>