export function createDateTimeInputValue(source = new Date()) {
  const date = source instanceof Date ? source : new Date(source)

  if (Number.isNaN(date.getTime())) {
    return createDateTimeInputValue()
  }

  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}

export function toDateTimeInputValue(value, fallback = createDateTimeInputValue()) {
  if (!value) {
    return fallback
  }

  const normalized = String(value).trim()

  if (normalized.length >= 16 && !normalized.endsWith('Z')) {
    return normalized.slice(0, 16)
  }

  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return createDateTimeInputValue(date)
}

export function formatDateTimeDisplay(value, emptyPlaceholder = '--') {
  if (!value) {
    return emptyPlaceholder
  }

  const normalized = String(value).trim()
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)

  if (match) {
    const [, year, month, day, hours, minutes, seconds = '00'] = match
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) {
    return normalized.replace('T', ' ')
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}