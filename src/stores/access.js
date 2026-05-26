import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { FEATURE_CATALOG, buildSeedState } from '../data/seed'

const STORAGE_KEY = 'equipment-inspection-v2.access-state'

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeText(value) {
  return value.trim()
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase()
}

function restoreState() {
  const fallbackState = buildSeedState()

  if (typeof window === 'undefined') {
    return fallbackState
  }

  const rawState = window.localStorage.getItem(STORAGE_KEY)

  if (!rawState) {
    return fallbackState
  }

  try {
    const parsedState = JSON.parse(rawState)

    if (!Array.isArray(parsedState.users) || !Array.isArray(parsedState.roles)) {
      return fallbackState
    }

    return {
      users: parsedState.users.map((user) => ({
        ...user,
        roleIds: Array.isArray(user.roleIds) ? [...user.roleIds] : [],
      })),
      roles: parsedState.roles.map((role) => ({
        ...role,
        featureIds: Array.isArray(role.featureIds) ? [...role.featureIds] : [],
      })),
      sessionUserId: parsedState.sessionUserId ?? null,
    }
  } catch {
    return fallbackState
  }
}

export const useAccessStore = defineStore('access', () => {
  const initialState = restoreState()
  const users = ref(initialState.users)
  const roles = ref(initialState.roles)
  const sessionUserId = ref(initialState.sessionUserId)

  const roleMap = computed(() =>
    roles.value.reduce((lookup, role) => {
      lookup[role.id] = role
      return lookup
    }, {}),
  )

  const activeUser = computed(
    () => users.value.find((user) => user.id === sessionUserId.value && !user.disabled) ?? null,
  )

  const activeRoles = computed(() => {
    if (!activeUser.value) {
      return []
    }

    return activeUser.value.roleIds.map((roleId) => roleMap.value[roleId]).filter(Boolean)
  })

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

  function persistState() {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        users: users.value,
        roles: roles.value,
        sessionUserId: sessionUserId.value,
      }),
    )
  }

  function login({ email, password }) {
    const normalizedEmail = normalizeEmail(email)
    const candidate = users.value.find((user) => normalizeEmail(user.email) === normalizedEmail)

    if (!candidate) {
      return { ok: false, message: '账号不存在，请检查邮箱地址。' }
    }

    if (candidate.disabled) {
      return { ok: false, message: '当前账号已被禁用，请联系管理员。' }
    }

    if (candidate.password !== password) {
      return { ok: false, message: '密码错误，请重新输入。' }
    }

    const loginAt = new Date().toISOString()

    users.value = users.value.map((user) =>
      user.id === candidate.id
        ? {
            ...user,
            lastLoginAt: loginAt,
          }
        : user,
    )

    sessionUserId.value = candidate.id

    return { ok: true }
  }

  function logout() {
    sessionUserId.value = null
  }

  function createUser(payload) {
    const accountName = normalizeText(payload.accountName)
    const name = normalizeText(payload.name)
    const email = normalizeEmail(payload.email)
    const phone = normalizeText(payload.phone)
    const password = payload.password
    const roleIds = Array.from(new Set(payload.roleIds))

    if (!accountName || !name || !email || !phone || !password) {
      return { ok: false, message: '请完整填写用户主数据。' }
    }

    if (password.length < 6) {
      return { ok: false, message: '密码长度至少为 6 位。' }
    }

    if (!roleIds.length) {
      return { ok: false, message: '请至少分配一个角色。' }
    }

    if (users.value.some((user) => normalizeEmail(user.email) === email)) {
      return { ok: false, message: '邮箱已存在，请使用其他邮箱。' }
    }

    if (users.value.some((user) => normalizeText(user.accountName) === accountName)) {
      return { ok: false, message: '账号名已存在，请更换后重试。' }
    }

    users.value = [
      {
        id: createId('user'),
        accountName,
        name,
        email,
        phone,
        password,
        roleIds,
        disabled: false,
      },
      ...users.value,
    ]

    return { ok: true, message: '用户已创建。' }
  }

  function toggleUserStatus(userId) {
    const targetUser = users.value.find((user) => user.id === userId)

    if (!targetUser) {
      return { ok: false, message: '用户不存在。' }
    }

    if (targetUser.id === sessionUserId.value && !targetUser.disabled) {
      return { ok: false, message: '当前登录用户不能被禁用。' }
    }

    users.value = users.value.map((user) =>
      user.id === userId
        ? {
            ...user,
            disabled: !user.disabled,
          }
        : user,
    )

    return {
      ok: true,
      message: targetUser.disabled ? '用户已重新启用。' : '用户已禁用。',
    }
  }

  function deleteUser(userId) {
    const targetUser = users.value.find((user) => user.id === userId)

    if (!targetUser) {
      return { ok: false, message: '用户不存在。' }
    }

    if (targetUser.id === sessionUserId.value) {
      return { ok: false, message: '当前登录用户不能删除自身。' }
    }

    users.value = users.value.filter((user) => user.id !== userId)

    return { ok: true, message: '用户已删除。' }
  }

  function createRole(payload) {
    const name = normalizeText(payload.name)
    const description = normalizeText(payload.description)
    const featureIds = Array.from(new Set(payload.featureIds))

    if (!name) {
      return { ok: false, message: '请输入角色名称。' }
    }

    if (!featureIds.length) {
      return { ok: false, message: '请至少为角色分配一个功能卡片。' }
    }

    if (roles.value.some((role) => normalizeText(role.name).toLowerCase() === name.toLowerCase())) {
      return { ok: false, message: '角色名称已存在。' }
    }

    roles.value = [
      ...roles.value,
      {
        id: createId('role'),
        name,
        description,
        featureIds,
        isSystem: false,
      },
    ]

    return { ok: true, message: '角色已创建。' }
  }

  function deleteRole(roleId) {
    const targetRole = roles.value.find((role) => role.id === roleId)

    if (!targetRole) {
      return { ok: false, message: '角色不存在。' }
    }

    if (targetRole.isSystem) {
      return { ok: false, message: '系统种子角色不可删除。' }
    }

    roles.value = roles.value.filter((role) => role.id !== roleId)
    users.value = users.value.map((user) => ({
      ...user,
      roleIds: user.roleIds.filter((assignedRoleId) => assignedRoleId !== roleId),
    }))

    return { ok: true, message: '角色已删除。' }
  }

  function canAccessFeature(featureId) {
    return grantedFeatureIds.value.includes(featureId)
  }

  function getFeatureById(featureId) {
    return FEATURE_CATALOG.find((feature) => feature.id === featureId) ?? null
  }

  watch([users, roles, sessionUserId], persistState, { deep: true })

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
    login,
    logout,
    roles,
    sessionUserId,
    toggleUserStatus,
    userDirectory,
    users,
  }
})