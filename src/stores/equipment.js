import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

async function requestEquipmentApi(path, init = {}) {
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
      message: '无法连接设备管理服务，请确认 Cloudflare Pages Functions 与 D1 已完成初始化。',
    }
  }
}

function byId(items) {
  return items.reduce((lookup, item) => {
    lookup[item.id] = item
    return lookup
  }, {})
}

export const useEquipmentStore = defineStore('equipment', () => {
  const ownerOptions = ref([])
  const inspectionItems = ref([])
  const taskLists = ref([])
  const spareParts = ref([])
  const equipments = ref([])
  const isInitializing = ref(false)
  const initializeError = ref('')

  function applyPayload(payload) {
    ownerOptions.value = Array.isArray(payload.ownerOptions) ? payload.ownerOptions : []
    inspectionItems.value = Array.isArray(payload.inspectionItems) ? payload.inspectionItems : []
    taskLists.value = Array.isArray(payload.taskLists) ? payload.taskLists : []
    spareParts.value = Array.isArray(payload.spareParts) ? payload.spareParts : []
    equipments.value = Array.isArray(payload.equipments) ? payload.equipments : []
    initializeError.value = ''
  }

  const ownerMap = computed(() => byId(ownerOptions.value))
  const inspectionItemMap = computed(() => byId(inspectionItems.value))
  const taskListMap = computed(() => byId(taskLists.value))
  const sparePartMap = computed(() => byId(spareParts.value))
  const equipmentMap = computed(() => byId(equipments.value))

  const equipmentDirectory = computed(() =>
    equipments.value.map((equipment) => ({
      ...equipment,
      owner: equipment.ownerUserId ? ownerMap.value[equipment.ownerUserId] ?? null : null,
      taskLists: equipment.taskListIds.map((taskListId) => taskListMap.value[taskListId]).filter(Boolean),
      spareParts: equipment.sparePartIds.map((sparePartId) => sparePartMap.value[sparePartId]).filter(Boolean),
    })),
  )

  const taskListDirectory = computed(() =>
    taskLists.value.map((taskList) => ({
      ...taskList,
      inspectionItems: taskList.inspectionItemIds
        .map((inspectionItemId) => inspectionItemMap.value[inspectionItemId])
        .filter(Boolean),
      assignedEquipmentCount: equipments.value.filter((equipment) => equipment.taskListIds.includes(taskList.id))
        .length,
    })),
  )

  const inspectionItemDirectory = computed(() =>
    inspectionItems.value.map((inspectionItem) => ({
      ...inspectionItem,
      taskListCount: taskLists.value.filter((taskList) => taskList.inspectionItemIds.includes(inspectionItem.id))
        .length,
    })),
  )

  const sparePartDirectory = computed(() =>
    spareParts.value.map((sparePart) => ({
      ...sparePart,
      equipments: sparePart.equipmentIds.map((equipmentId) => equipmentMap.value[equipmentId]).filter(Boolean),
    })),
  )

  const summaryMetrics = computed(() => ({
    totalEquipment: equipments.value.length,
    activeEquipment: equipments.value.filter((equipment) => equipment.status === '在用').length,
    totalTaskLists: taskLists.value.length,
    totalInspectionItems: inspectionItems.value.length,
    totalSpareParts: spareParts.value.length,
  }))

  async function initialize() {
    isInitializing.value = true

    try {
      const result = await requestEquipmentApi('/api/equipment/bootstrap')

      if (!result.ok) {
        initializeError.value = result.message
        return result
      }

      applyPayload(result)
      return { ok: true }
    } finally {
      isInitializing.value = false
    }
  }

  async function createEquipment(payload) {
    const result = await requestEquipmentApi('/api/equipment', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function updateEquipment(equipmentId, payload) {
    const result = await requestEquipmentApi(`/api/equipment/${equipmentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function deleteEquipment(equipmentId) {
    const result = await requestEquipmentApi(`/api/equipment/${equipmentId}`, {
      method: 'DELETE',
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function createInspectionItem(payload) {
    const result = await requestEquipmentApi('/api/inspection-items', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function updateInspectionItem(itemId, payload) {
    const result = await requestEquipmentApi(`/api/inspection-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function deleteInspectionItem(itemId) {
    const result = await requestEquipmentApi(`/api/inspection-items/${itemId}`, {
      method: 'DELETE',
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function createTaskList(payload) {
    const result = await requestEquipmentApi('/api/task-lists', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function updateTaskList(taskListId, payload) {
    const result = await requestEquipmentApi(`/api/task-lists/${taskListId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function deleteTaskList(taskListId) {
    const result = await requestEquipmentApi(`/api/task-lists/${taskListId}`, {
      method: 'DELETE',
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function createSparePart(payload) {
    const result = await requestEquipmentApi('/api/spare-parts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function updateSparePart(sparePartId, payload) {
    const result = await requestEquipmentApi(`/api/spare-parts/${sparePartId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function deleteSparePart(sparePartId) {
    const result = await requestEquipmentApi(`/api/spare-parts/${sparePartId}`, {
      method: 'DELETE',
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  return {
    createEquipment,
    createInspectionItem,
    createSparePart,
    createTaskList,
    deleteEquipment,
    deleteInspectionItem,
    deleteSparePart,
    deleteTaskList,
    equipmentDirectory,
    equipments,
    initialize,
    initializeError,
    inspectionItemDirectory,
    inspectionItems,
    isInitializing,
    ownerOptions,
    sparePartDirectory,
    spareParts,
    summaryMetrics,
    taskListDirectory,
    taskLists,
    updateEquipment,
    updateInspectionItem,
    updateSparePart,
    updateTaskList,
  }
})