import { createI18n } from 'vue-i18n'

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, messages } from './messages'

const STATIC_TEXT_MAP = {
  管理员: 'Administrator',
  点检员: 'Inspector',
  设备工程师: 'Equipment Engineer',
  在用: 'In service',
  停用: 'Inactive',
  检修中: 'Under maintenance',
  待报废: 'Pending retirement',
  待执行: 'Pending',
  执行中: 'In progress',
  已完成: 'Completed',
  低: 'Low',
  中: 'Medium',
  高: 'High',
  紧急: 'Critical',
  待派工: 'Pending dispatch',
  维修中: 'Under repair',
  待验收: 'Pending acceptance',
  待确认: 'Pending confirmation',
  处理中: 'Processing',
  已确认: 'Confirmed',
  进行中: 'In progress',
  完成: 'Completed',
  取消: 'Cancelled',
  正常: 'Normal',
  异常: 'Abnormal',
  无: 'None',
  未填写: 'Not provided',
  未分配: 'Unassigned',
  未配置: 'Not configured',
  未关联: 'Not linked',
  未关联设备: 'No linked equipment',
  未创建: 'Not created',
  未登录: 'Never signed in',
  待生成: 'Pending generation',
  待生成任务单号: 'Task number pending',
}

function normalizeLocale(locale) {
  if (SUPPORTED_LOCALES.includes(locale)) {
    return locale
  }

  if (locale?.toLowerCase().startsWith('en')) {
    return 'en-US'
  }

  return DEFAULT_LOCALE
}

function readSavedLocale() {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)

  if (storedLocale) {
    return normalizeLocale(storedLocale)
  }

  return normalizeLocale(window.navigator.language)
}

export const i18n = createI18n({
  legacy: false,
  locale: readSavedLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
})

export function setLocale(locale) {
  const normalizedLocale = normalizeLocale(locale)
  i18n.global.locale.value = normalizedLocale

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, normalizedLocale)
  }

  return normalizedLocale
}

export function translate(key, values) {
  return i18n.global.t(key, values)
}

export function pickLocaleText(zhText, enText) {
  return i18n.global.locale.value === 'en-US' ? enText : zhText
}

export function translateStaticText(value) {
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) {
    return normalizedValue
  }

  return pickLocaleText(normalizedValue, STATIC_TEXT_MAP[normalizedValue] ?? normalizedValue)
}

export function resolveFeatureText(feature, field) {
  const key = feature?.[`${field}Key`]

  if (key) {
    return translate(key)
  }

  return feature?.[field] ?? ''
}

export function resolveRoleName(role) {
  return role?.nameKey ? translate(role.nameKey) : role?.name ?? ''
}

export function resolveRoleDescription(role) {
  return role?.descriptionKey ? translate(role.descriptionKey) : role?.description ?? ''
}

export { DEFAULT_LOCALE, SUPPORTED_LOCALES }