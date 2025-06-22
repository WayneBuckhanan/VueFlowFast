<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    :closable="!isLoading"
    :draggable="false"
    :resizable="false"
    class="auth-modal"
    :style="{ width: '90vw', maxWidth: '500px' }"
    @hide="handleClose"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-user text-xl"></i>
        <span class="font-semibold">Authentication</span>
      </div>
    </template>

    <div class="auth-modal-content">
      <!-- Login Form -->
      <LoginForm
        v-if="currentStep === 'login'"
        :initial-email="email"
        @success="handleLoginSuccess"
        @error="handleError"
      />

      <!-- Verify Code Form -->
      <VerifyCodeForm
        v-else-if="currentStep === 'verify'"
        :email="email"
        @success="handleVerifySuccess"
        @error="handleError"
        @back="handleBack"
        @resend="handleResend"
      />

      <!-- Success Message -->
      <div v-else-if="currentStep === 'success'" class="success-content text-center">
        <div class="mb-4">
          <i class="pi pi-check-circle text-4xl text-green-500 mb-4"></i>
          <h2 class="text-2xl font-bold mb-2">Welcome!</h2>
          <p class="text-gray-600">You have been successfully authenticated.</p>
        </div>
        <Button
          label="Continue"
          @click="handleContinue"
          class="w-full"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <div class="text-sm text-gray-500">
          Step {{ currentStepNumber }} of 2
        </div>
        <Button
          v-if="!isLoading && currentStep !== 'success'"
          text
          severity="secondary"
          label="Cancel"
          @click="handleCancel"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import LoginForm from './LoginForm.vue'
import VerifyCodeForm from './VerifyCodeForm.vue'

// Props
interface Props {
  visible?: boolean
  initialEmail?: string
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  initialEmail: ''
})

// Emits
interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'authenticated', user: any): void
  (e: 'cancelled'): void
  (e: 'error', error: string): void
}

const emit = defineEmits<Emits>()

// Store
const authStore = useAuthStore()

// Reactive state
type AuthStep = 'login' | 'verify' | 'success'
const currentStep = ref<AuthStep>('login')
const email = ref(props.initialEmail)
const authenticatedUser = ref(null)

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const isLoading = computed(() => authStore.isLoading)

const currentStepNumber = computed(() => {
  switch (currentStep.value) {
    case 'login': return 1
    case 'verify': return 2
    case 'success': return 2
    default: return 1
  }
})

// Methods
const resetModal = () => {
  currentStep.value = 'login'
  email.value = props.initialEmail
  authenticatedUser.value = null
  authStore.clearError()
}

const handleLoginSuccess = (userEmail: string) => {
  email.value = userEmail
  currentStep.value = 'verify'
}

const handleVerifySuccess = (user: any) => {
  authenticatedUser.value = user
  currentStep.value = 'success'
}

const handleError = (error: string) => {
  emit('error', error)
}

const handleBack = () => {
  currentStep.value = 'login'
  authStore.clearError()
}

const handleResend = async (userEmail: string) => {
  try {
    const result = await authStore.login(userEmail)
    if (!result.success) {
      handleError(result.error || 'Failed to resend verification code')
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to resend code'
    handleError(errorMessage)
  }
}

const handleContinue = () => {
  if (authenticatedUser.value) {
    emit('authenticated', authenticatedUser.value)
  }
  handleClose()
}

const handleCancel = () => {
  emit('cancelled')
  handleClose()
}

const handleClose = () => {
  isVisible.value = false
  // Reset modal state after a short delay to allow for smooth closing animation
  setTimeout(resetModal, 300)
}

// Watch for visibility changes to reset modal
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    resetModal()
  }
})

// Watch for initial email changes
watch(() => props.initialEmail, (newEmail) => {
  if (newEmail && currentStep.value === 'login') {
    email.value = newEmail
  }
})
</script>

<style scoped>
.auth-modal-content {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.success-content {
  padding: 2rem;
}

.text-green-500 {
  color: #10b981;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-600 {
  color: #4b5563;
}
</style>

<style>
/* Global styles for the auth modal */
.auth-modal .p-dialog-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
}

.auth-modal .p-dialog-content {
  padding: 0 1.5rem;
}

.auth-modal .p-dialog-footer {
  padding: 1rem 1.5rem 1.5rem 1.5rem;
}
</style>