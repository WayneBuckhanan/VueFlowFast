<template>
  <div class="login-form">
    <div class="mb-4">
      <h2 class="text-2xl font-bold text-center mb-2">Sign In</h2>
      <p class="text-center text-gray-600">Enter your email to receive a verification code</p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="field">
        <label for="email" class="block text-sm font-medium mb-2">Email Address</label>
        <InputText
          id="email"
          v-model="email"
          type="email"
          placeholder="Enter your email"
          :invalid="!!emailError"
          :disabled="isLoading"
          class="w-full"
          autocomplete="email"
          required
        />
        <small v-if="emailError" class="text-red-500">{{ emailError }}</small>
      </div>

      <Button
        type="submit"
        :loading="isLoading"
        :disabled="!isEmailValid || isLoading"
        class="w-full"
        label="Send Verification Code"
      />

      <Message
        v-if="error"
        severity="error"
        :closable="false"
        class="mt-4"
      >
        {{ error }}
      </Message>

      <Message
        v-if="successMessage"
        severity="success"
        :closable="false"
        class="mt-4"
      >
        {{ successMessage }}
      </Message>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'

// Props
interface Props {
  initialEmail?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialEmail: ''
})

// Emits
interface Emits {
  (e: 'success', email: string): void
  (e: 'error', error: string): void
}

const emit = defineEmits<Emits>()

// Store
const authStore = useAuthStore()

// Reactive state
const email = ref(props.initialEmail)
const emailError = ref('')
const successMessage = ref('')

// Computed
const isLoading = computed(() => authStore.isLoading)
const error = computed(() => authStore.error)

const isEmailValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return email.value && emailRegex.test(email.value)
})

// Methods
const validateEmail = () => {
  emailError.value = ''
  
  if (!email.value) {
    emailError.value = 'Email is required'
    return false
  }
  
  if (!isEmailValid.value) {
    emailError.value = 'Please enter a valid email address'
    return false
  }
  
  return true
}

const handleSubmit = async () => {
  if (!validateEmail()) {
    return
  }

  authStore.clearError()
  successMessage.value = ''

  try {
    const result = await authStore.login(email.value)
    
    if (result.success) {
      successMessage.value = result.message || 'Verification code sent to your email'
      emit('success', email.value)
    } else {
      emit('error', result.error || 'Failed to send verification code')
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
    emit('error', errorMessage)
  }
}

// Watch for email changes to clear errors
watch(email, () => {
  if (emailError.value) {
    emailError.value = ''
  }
  if (successMessage.value) {
    successMessage.value = ''
  }
  authStore.clearError()
})

// Watch for store errors
watch(error, (newError) => {
  if (newError) {
    successMessage.value = ''
  }
})
</script>

<style scoped>
.login-form {
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
</style>