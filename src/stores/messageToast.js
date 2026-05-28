import { defineStore } from 'pinia'
import { ref } from 'vue'

let nextToastId = 0

export const useMessageToastStore = defineStore('messageToast', () => {
  const toasts = ref([])
  const activeTimers = new Map()

  function remove(toastId) {
    const timerId = activeTimers.get(toastId)

    if (timerId) {
      window.clearTimeout(timerId)
      activeTimers.delete(toastId)
    }

    toasts.value = toasts.value.filter((toast) => toast.id !== toastId)
  }

  function show(message, type = 'info', duration = 5000) {
    if (!message) {
      return
    }

    const toastId = `toast-${Date.now()}-${nextToastId++}`
    toasts.value.push({
      id: toastId,
      message,
      type,
    })

    const timerId = window.setTimeout(() => {
      remove(toastId)
    }, duration)

    activeTimers.set(toastId, timerId)
  }

  return {
    remove,
    show,
    toasts,
  }
})
