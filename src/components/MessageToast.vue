<script setup>
import { storeToRefs } from 'pinia'

import { useMessageToastStore } from '../stores/messageToast'

const toastStore = useMessageToastStore()
const { toasts } = storeToRefs(toastStore)
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-region">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-card"
        :class="`toast-card--${toast.type}`"
        :role="toast.type === 'error' ? 'alert' : 'status'"
        aria-live="polite"
      >
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </Teleport>
</template>
