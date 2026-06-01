import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

async function requestWorkOrderApi(path, init = {}) {
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
      message: '服务返回了无法识别的响应。',
    }))

    if (!response.ok) {
      return {
        ok: false,
        message: payload.message || '请求失败，请稍后重试。',
      }
    }

    return payload
  } catch {
    return {
      ok: false,
      message: '无法连接维修工单服务，请确认 Cloudflare Pages Functions 与 D1 已完成初始化。',
    }
  }
}

export const useWorkOrderStore = defineStore('workOrders', () => {
  const workOrders = ref([])
  const equipmentOptions = ref([])
  const creatorOptions = ref([])
  const engineerOptions = ref([])
  const faultCodes = ref([])
  const sparePartOptions = ref([])
  const priorityOptions = ref([])
  const taskStatusOptions = ref([])
  const draftWorkOrder = ref(null)
  const activeWorkOrder = ref(null)
  const isInitializing = ref(false)
  const isLoadingWorkOrder = ref(false)
  const initializeError = ref('')

  function applyBootstrap(payload) {
    workOrders.value = Array.isArray(payload.workOrders) ? payload.workOrders : []
    equipmentOptions.value = Array.isArray(payload.equipmentOptions) ? payload.equipmentOptions : []
    creatorOptions.value = Array.isArray(payload.creatorOptions) ? payload.creatorOptions : []
    engineerOptions.value = Array.isArray(payload.engineerOptions) ? payload.engineerOptions : []
    faultCodes.value = Array.isArray(payload.faultCodes) ? payload.faultCodes : []
    sparePartOptions.value = Array.isArray(payload.sparePartOptions) ? payload.sparePartOptions : []
    priorityOptions.value = Array.isArray(payload.priorityOptions) ? payload.priorityOptions : []
    taskStatusOptions.value = Array.isArray(payload.taskStatusOptions) ? payload.taskStatusOptions : []
    draftWorkOrder.value = payload.draftWorkOrder ?? null
    initializeError.value = ''
  }

  function applyWorkOrderDetail(payload) {
    activeWorkOrder.value = payload.workOrder ?? null
    if (Array.isArray(payload.equipmentOptions)) {
      equipmentOptions.value = payload.equipmentOptions
    }
    if (Array.isArray(payload.creatorOptions)) {
      creatorOptions.value = payload.creatorOptions
    }
    if (Array.isArray(payload.engineerOptions)) {
      engineerOptions.value = payload.engineerOptions
    }
    if (Array.isArray(payload.faultCodes)) {
      faultCodes.value = payload.faultCodes
    }
    if (Array.isArray(payload.sparePartOptions)) {
      sparePartOptions.value = payload.sparePartOptions
    }
    if (Array.isArray(payload.priorityOptions)) {
      priorityOptions.value = payload.priorityOptions
    }
    if (Array.isArray(payload.taskStatusOptions)) {
      taskStatusOptions.value = payload.taskStatusOptions
    }
  }

  const workOrderDirectory = computed(() => workOrders.value)

  function getEquipmentById(equipmentId) {
    return equipmentOptions.value.find((equipment) => equipment.id === equipmentId) ?? null
  }

  function getCreatorById(userId) {
    return creatorOptions.value.find((user) => user.id === userId) ?? null
  }

  function getEngineerById(userId) {
    return engineerOptions.value.find((user) => user.id === userId) ?? null
  }

  async function initialize(sourceTaskId = '') {
    isInitializing.value = true

    try {
      const query = sourceTaskId ? `?sourceTaskId=${encodeURIComponent(sourceTaskId)}` : ''
      const result = await requestWorkOrderApi(`/api/work-orders/bootstrap${query}`)

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

  async function createWorkOrder(payload) {
    const result = await requestWorkOrderApi('/api/work-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyBootstrap(result)
    }

    return result
  }

  async function updateWorkOrder(workOrderId, payload) {
    const result = await requestWorkOrderApi(`/api/work-orders/${workOrderId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      if (Array.isArray(result.workOrders)) {
        applyBootstrap(result)
      }
      if (result.workOrder) {
        applyWorkOrderDetail(result)
      }
    }

    return result
  }

  async function deleteWorkOrder(workOrderId) {
    const result = await requestWorkOrderApi(`/api/work-orders/${workOrderId}`, {
      method: 'DELETE',
    })

    if (result.ok) {
      applyBootstrap(result)

      if (activeWorkOrder.value?.id === workOrderId) {
        activeWorkOrder.value = null
      }
    }

    return result
  }

  async function confirmWorkOrder(workOrderId, payload) {
    const result = await requestWorkOrderApi(`/api/work-orders/${workOrderId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      if (Array.isArray(result.workOrders)) {
        applyBootstrap(result)
      }
      if (result.workOrder) {
        applyWorkOrderDetail(result)
      }
    }

    return result
  }

  async function loadWorkOrder(workOrderId) {
    isLoadingWorkOrder.value = true

    try {
      const result = await requestWorkOrderApi(`/api/work-orders/${workOrderId}`)

      if (result.ok) {
        applyWorkOrderDetail(result)
      }

      return result
    } finally {
      isLoadingWorkOrder.value = false
    }
  }

  async function createTask(workOrderId, payload) {
    const result = await requestWorkOrderApi(`/api/work-orders/${workOrderId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      if (Array.isArray(result.workOrders)) {
        applyBootstrap(result)
      }
      if (result.workOrder) {
        applyWorkOrderDetail(result)
      }
    }

    return result
  }

  async function saveSpareParts(workOrderId, payload) {
    const result = await requestWorkOrderApi(`/api/work-orders/${workOrderId}/spare-parts`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      if (Array.isArray(result.workOrders)) {
        applyBootstrap(result)
      }
      if (result.workOrder) {
        applyWorkOrderDetail(result)
      }
    }

    return result
  }

  async function updateTask(workOrderId, taskId, payload) {
    const result = await requestWorkOrderApi(`/api/work-orders/${workOrderId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      if (Array.isArray(result.workOrders)) {
        applyBootstrap(result)
      }
      if (result.workOrder) {
        applyWorkOrderDetail(result)
      }
    }

    return result
  }

  async function deleteTask(workOrderId, taskId) {
    const result = await requestWorkOrderApi(`/api/work-orders/${workOrderId}/tasks/${taskId}`, {
      method: 'DELETE',
    })

    if (result.ok) {
      if (Array.isArray(result.workOrders)) {
        applyBootstrap(result)
      }
      if (result.workOrder) {
        applyWorkOrderDetail(result)
      }
    }

    return result
  }

  return {
    activeWorkOrder,
    confirmWorkOrder,
    createTask,
    createWorkOrder,
    creatorOptions,
    deleteTask,
    deleteWorkOrder,
    draftWorkOrder,
    engineerOptions,
    equipmentOptions,
    faultCodes,
    getCreatorById,
    getEngineerById,
    getEquipmentById,
    initialize,
    initializeError,
    isInitializing,
    isLoadingWorkOrder,
    loadWorkOrder,
    priorityOptions,
    saveSpareParts,
    sparePartOptions,
    taskStatusOptions,
    updateTask,
    updateWorkOrder,
    workOrderDirectory,
    workOrders,
  }
})