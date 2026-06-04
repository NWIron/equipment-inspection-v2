import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { pickLocaleText } from '../i18n'

async function requestInspectionTaskApi(path, init = {}) {
  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    })

    const payload = await response.json().catch(() => ({
      ok: false,
      message: pickLocaleText('服务返回了无法识别的响应。', 'The service returned an unreadable response.'),
    }))

    if (!response.ok) {
      return {
        ok: false,
        message: payload.message || pickLocaleText('请求失败，请稍后重试。', 'The request failed. Please try again later.'),
      }
    }

    return payload
  } catch {
    return {
      ok: false,
      message: pickLocaleText(
        '无法连接点检任务服务，请确认 Cloudflare Pages Functions 与 D1 已完成初始化。',
        'Unable to connect to the inspection-task service. Confirm that Cloudflare Pages Functions and D1 have been initialized.',
      ),
    }
  }
}

export const useInspectionTaskStore = defineStore('inspectionTasks', () => {
  const tasks = ref([])
  const equipmentOptions = ref([])
  const inspectorOptions = ref([])
  const faultCodes = ref([])
  const priorityOptions = ref([])
  const statusOptions = ref([])
  const resultStatusOptions = ref([])
  const activeTask = ref(null)
  const isInitializing = ref(false)
  const isLoadingTask = ref(false)
  const initializeError = ref('')

  function applyBootstrap(payload) {
    tasks.value = Array.isArray(payload.tasks) ? payload.tasks : []
    equipmentOptions.value = Array.isArray(payload.equipmentOptions) ? payload.equipmentOptions : []
    inspectorOptions.value = Array.isArray(payload.inspectorOptions) ? payload.inspectorOptions : []
    faultCodes.value = Array.isArray(payload.faultCodes) ? payload.faultCodes : []
    priorityOptions.value = Array.isArray(payload.priorityOptions) ? payload.priorityOptions : []
    statusOptions.value = Array.isArray(payload.statusOptions) ? payload.statusOptions : []
    resultStatusOptions.value = Array.isArray(payload.resultStatusOptions) ? payload.resultStatusOptions : []
    initializeError.value = ''
  }

  function applyTaskDetail(payload) {
    activeTask.value = payload.task ?? null
    if (Array.isArray(payload.equipmentOptions)) {
      equipmentOptions.value = payload.equipmentOptions
    }
    if (Array.isArray(payload.inspectorOptions)) {
      inspectorOptions.value = payload.inspectorOptions
    }
    if (Array.isArray(payload.faultCodes)) {
      faultCodes.value = payload.faultCodes
    }
    if (Array.isArray(payload.priorityOptions)) {
      priorityOptions.value = payload.priorityOptions
    }
    if (Array.isArray(payload.statusOptions)) {
      statusOptions.value = payload.statusOptions
    }
    if (Array.isArray(payload.resultStatusOptions)) {
      resultStatusOptions.value = payload.resultStatusOptions
    }
  }

  const taskDirectory = computed(() => tasks.value)

  function getEquipmentById(equipmentId) {
    return equipmentOptions.value.find((equipment) => equipment.id === equipmentId) ?? null
  }

  async function initialize() {
    isInitializing.value = true

    try {
      const result = await requestInspectionTaskApi('/api/inspection-tasks/bootstrap')

      if (!result.ok) {
        initializeError.value = result.message
        return result
      }

      applyBootstrap(result)
      return { ok: true }
    } finally {
      isInitializing.value = false
    }
  }

  async function createTask(payload) {
    const result = await requestInspectionTaskApi('/api/inspection-tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyBootstrap(result)
    }

    return result
  }

  async function updateTask(taskId, payload) {
    const result = await requestInspectionTaskApi(`/api/inspection-tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyBootstrap(result)
    }

    return result
  }

  async function deleteTask(taskId) {
    const result = await requestInspectionTaskApi(`/api/inspection-tasks/${taskId}`, {
      method: 'DELETE',
    })

    if (result.ok) {
      applyBootstrap(result)
    }

    return result
  }

  async function loadTask(taskId) {
    isLoadingTask.value = true

    try {
      const result = await requestInspectionTaskApi(`/api/inspection-tasks/${taskId}`)

      if (result.ok) {
        applyTaskDetail(result)
      }

      return result
    } finally {
      isLoadingTask.value = false
    }
  }

  async function saveTaskResults(taskId, payload) {
    const result = await requestInspectionTaskApi(`/api/inspection-tasks/${taskId}/results`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyTaskDetail(result)
      tasks.value = tasks.value.map((task) => (task.id === taskId ? result.task : task))
    }

    return result
  }

  async function completeTask(taskId) {
    const result = await requestInspectionTaskApi(`/api/inspection-tasks/${taskId}/complete`, {
      method: 'POST',
    })

    if (result.ok) {
      applyTaskDetail(result)
      tasks.value = tasks.value.map((task) => (task.id === taskId ? result.task : task))
    }

    return result
  }

  return {
    activeTask,
    completeTask,
    createTask,
    deleteTask,
    equipmentOptions,
    faultCodes,
    getEquipmentById,
    initialize,
    initializeError,
    inspectorOptions,
    isInitializing,
    isLoadingTask,
    loadTask,
    priorityOptions,
    resultStatusOptions,
    saveTaskResults,
    statusOptions,
    taskDirectory,
    tasks,
    updateTask,
  }
})