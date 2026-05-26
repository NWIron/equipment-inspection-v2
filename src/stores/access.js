import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { FEATURE_CATALOG } from '../data/seed'

async function requestAccessApi(path, init = {}) {
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
      message: '无法连接后端服务，请确认 Cloudflare Pages Functions 与 D1 已完成初始化。',
    }
  }
}

export const useAccessStore = defineStore('access', () => {
  const users = ref([])
  const roles = ref([])
  const activeUser = ref(null)
  const activeRoles = ref([])
  const sessionUserId = ref(null)
  const isInitializing = ref(false)
  const initializeError = ref('')

  const roleMap = computed(() =>
    roles.value.reduce((lookup, role) => {
      lookup[role.id] = role
      return lookup
    }, {}),
  )

  const grantedFeatureIds = computed(() =>
    Array.from(new Set(activeRoles.value.flatMap((role) => role.featureIds))),
  )

  const availableFeatures = computed(() =>
    FEATURE_CATALOG.filter((feature) => grantedFeatureIds.value.includes(feature.id)),
  )

  const isAuthenticated = computed(() => Boolean(activeUser.value))

  const userDirectory = computed(() =>
    users.value.map((user) => ({
      ...user,
      roles: user.roleIds.map((roleId) => roleMap.value[roleId]).filter(Boolean),
    })),
  )

  const dashboardMetrics = computed(() => ({
    totalUsers: users.value.length,
    activeUsers: users.value.filter((user) => !user.disabled).length,
    totalRoles: roles.value.length,
    totalCards: FEATURE_CATALOG.length,
  }))

  function applyPayload(payload) {
    sessionUserId.value = payload.sessionUserId ?? null
    activeUser.value = payload.activeUser ?? null
    activeRoles.value = Array.isArray(payload.activeRoles) ? payload.activeRoles : []
    users.value = Array.isArray(payload.users) ? payload.users : []
    roles.value = Array.isArray(payload.roles) ? payload.roles : []
    initializeError.value = ''
  }

  function clearPayload() {
    sessionUserId.value = null
    activeUser.value = null
    activeRoles.value = []
    users.value = []
    roles.value = []
  }

  async function initialize() {
    isInitializing.value = true

    try {
      const result = await requestAccessApi('/api/bootstrap')

      if (!result.ok) {
        clearPayload()
        initializeError.value = result.message
        return result
      }

      applyPayload(result)
      return { ok: true }
    } finally {
      isInitializing.value = false
    }
  }

  async function login(credentials) {
    const result = await requestAccessApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function logout() {
    await requestAccessApi('/api/auth/logout', {
      method: 'POST',
    })
    clearPayload()
    return { ok: true }
  }

  async function createUser(payload) {
    const result = await requestAccessApi('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function toggleUserStatus(userId) {
    const result = await requestAccessApi(`/api/users/${userId}/status`, {
      method: 'POST',
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function deleteUser(userId) {
    const result = await requestAccessApi(`/api/users/${userId}`, {
      method: 'DELETE',
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function createRole(payload) {
    const result = await requestAccessApi('/api/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  async function deleteRole(roleId) {
    const result = await requestAccessApi(`/api/roles/${roleId}`, {
      method: 'DELETE',
    })

    if (result.ok) {
      applyPayload(result)
    }

    return result
  }

  function canAccessFeature(featureId) {
    return grantedFeatureIds.value.includes(featureId)
  }

  function getFeatureById(featureId) {
    return FEATURE_CATALOG.find((feature) => feature.id === featureId) ?? null
  }

  return {
    activeRoles,
    activeUser,
    availableFeatures,
    canAccessFeature,
    createRole,
    createUser,
    dashboardMetrics,
    deleteRole,
    deleteUser,
    featureCatalog: FEATURE_CATALOG,
    getFeatureById,
    grantedFeatureIds,
    isAuthenticated,
    initialize,
    initializeError,
    isInitializing,
    login,
    logout,
    roles,
    sessionUserId,
    toggleUserStatus,
    userDirectory,
    users,
  }
})