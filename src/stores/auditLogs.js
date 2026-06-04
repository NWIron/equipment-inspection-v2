import { ref } from 'vue'
import { defineStore } from 'pinia'

import { pickLocaleText } from '../i18n'

const EMPTY_SUMMARY = {
  total: 0,
  createCount: 0,
  updateCount: 0,
  deleteCount: 0,
  operatorCount: 0,
}

const EMPTY_FILTER_OPTIONS = {
  actions: [],
  features: [],
  operators: [],
}

async function requestAuditLogApi(path, init = {}) {
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
        '无法连接日志审计服务，请确认 Cloudflare Pages Functions 与 D1 已完成初始化。',
        'Unable to connect to the audit-log service. Confirm that Cloudflare Pages Functions and D1 have been initialized.',
      ),
    }
  }
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function buildQuery(filters = {}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    const normalizedValue = normalizeText(value)

    if (normalizedValue) {
      params.set(key, normalizedValue)
    }
  }

  if (!params.has('limit')) {
    params.set('limit', '200')
  }

  return params.toString() ? `?${params.toString()}` : ''
}

export const useAuditLogStore = defineStore('auditLogs', () => {
  const rows = ref([])
  const filterOptions = ref({ ...EMPTY_FILTER_OPTIONS })
  const summary = ref({ ...EMPTY_SUMMARY })
  const isLoading = ref(false)
  const initializeError = ref('')

  function applyPayload(payload) {
    rows.value = Array.isArray(payload.rows) ? payload.rows : []
    filterOptions.value = {
      actions: Array.isArray(payload.filterOptions?.actions) ? payload.filterOptions.actions : [],
      features: Array.isArray(payload.filterOptions?.features) ? payload.filterOptions.features : [],
      operators: Array.isArray(payload.filterOptions?.operators) ? payload.filterOptions.operators : [],
    }
    summary.value = {
      total: Number(payload.summary?.total ?? 0),
      createCount: Number(payload.summary?.createCount ?? 0),
      updateCount: Number(payload.summary?.updateCount ?? 0),
      deleteCount: Number(payload.summary?.deleteCount ?? 0),
      operatorCount: Number(payload.summary?.operatorCount ?? 0),
    }
    initializeError.value = ''
  }

  async function initialize(filters = {}) {
    isLoading.value = true

    try {
      const result = await requestAuditLogApi(`/api/audit-logs/bootstrap${buildQuery(filters)}`)

      if (!result.ok) {
        rows.value = []
        filterOptions.value = { ...EMPTY_FILTER_OPTIONS }
        summary.value = { ...EMPTY_SUMMARY }
        initializeError.value = result.message
        return result
      }

      applyPayload(result)
      return { ok: true }
    } finally {
      isLoading.value = false
    }
  }

  return {
    filterOptions,
    initialize,
    initializeError,
    isLoading,
    rows,
    summary,
  }
})