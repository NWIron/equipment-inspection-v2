const AUDIT_METHODS = new Set(['POST', 'PUT', 'DELETE'])

const FEATURE_ID_BY_SEGMENT = {
  users: 'access-management',
  roles: 'access-management',
  equipment: 'equipment',
  'inspection-items': 'equipment',
  'task-lists': 'equipment',
  'fault-codes': 'equipment',
  'spare-parts': 'equipment',
  'inspection-tasks': 'inspection-tasks',
  'work-orders': 'work-orders',
}

const RESOURCE_TYPE_BY_SEGMENT = {
  users: 'user',
  roles: 'role',
  equipment: 'equipment',
  'inspection-items': 'inspection-item',
  'task-lists': 'task-list',
  'fault-codes': 'fault-code',
  'spare-parts': 'spare-part',
  'inspection-tasks': 'inspection-task',
  'work-orders': 'work-order',
}

const REDACTED_KEYS = new Set(['password', 'passwordHash', 'password_hash', 'passwordSalt', 'password_salt'])
const BLOB_KEYS = new Set(['photoData', 'photo_data'])
const SUMMARY_KEYS = [
  'accountName',
  'equipmentCode',
  'partNumber',
  'taskNumber',
  'orderNumber',
  'faultCode',
  'code',
  'name',
  'description',
  'email',
]

function trimText(value, maxLength = 240) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return ''
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized
}

function sanitizeAuditValue(value, key = '') {
  if (value == null) {
    return value
  }

  if (Array.isArray(value)) {
    const items = value.slice(0, 20).map((entry) => sanitizeAuditValue(entry, key))

    if (value.length > 20) {
      items.push(`[+${value.length - 20} more items]`)
    }

    return items
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).slice(0, 40)
    const sanitized = {}

    for (const [entryKey, entryValue] of entries) {
      sanitized[entryKey] = sanitizeAuditValue(entryValue, entryKey)
    }

    if (Object.keys(value).length > 40) {
      sanitized.__truncated__ = `[+${Object.keys(value).length - 40} more fields]`
    }

    return sanitized
  }

  if (typeof value === 'string') {
    if (REDACTED_KEYS.has(key)) {
      return '[REDACTED]'
    }

    if (BLOB_KEYS.has(key)) {
      return `[BLOB length=${value.length}]`
    }

    return trimText(value, 500)
  }

  return value
}

function resolveAction(method, segments) {
  if (method === 'DELETE') {
    return 'DELETE'
  }

  if (method === 'PUT') {
    return 'UPDATE'
  }

  if (segments[0] === 'users' && segments[2] === 'status') {
    return 'UPDATE'
  }

  if (segments[0] === 'inspection-tasks' && segments[2] === 'complete') {
    return 'UPDATE'
  }

  if (segments[0] === 'inspection-tasks' && segments[2] === 'results') {
    return 'UPDATE'
  }

  if (segments[0] === 'work-orders' && segments[2] === 'confirm') {
    return 'UPDATE'
  }

  if (segments[0] === 'work-orders' && segments[2] === 'spare-parts') {
    return 'UPDATE'
  }

  return 'CREATE'
}

function resolveResourceType(segments) {
  if (segments[0] === 'work-orders' && segments[2] === 'tasks') {
    return 'work-order-task'
  }

  if (segments[0] === 'work-orders' && segments[2] === 'spare-parts') {
    return 'work-order-spare-parts'
  }

  if (segments[0] === 'inspection-tasks' && segments[2] === 'results') {
    return 'inspection-task-results'
  }

  return RESOURCE_TYPE_BY_SEGMENT[segments[0]] ?? segments[0]
}

function resolveResourceId(segments) {
  if (segments[0] === 'work-orders' && segments[2] === 'tasks') {
    return trimText(segments[3] ?? segments[1] ?? '', 80)
  }

  if (segments[0] === 'work-orders' && segments[2] === 'spare-parts') {
    return trimText(segments[1] ?? '', 80)
  }

  if (segments[0] === 'inspection-tasks' && (segments[2] === 'results' || segments[2] === 'complete')) {
    return trimText(segments[1] ?? '', 80)
  }

  if (segments[0] === 'users' && segments[2] === 'status') {
    return trimText(segments[1] ?? '', 80)
  }

  return trimText(segments[1] ?? '', 80)
}

function extractSummaryValue(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ''
  }

  for (const key of SUMMARY_KEYS) {
    const value = payload[key]

    if (typeof value === 'string' && value.trim()) {
      return trimText(value, 120)
    }
  }

  return ''
}

export function resolveAuditMetadata(request) {
  const method = request.method.toUpperCase()

  if (!AUDIT_METHODS.has(method)) {
    return null
  }

  const url = new URL(request.url)

  if (!url.pathname.startsWith('/api/')) {
    return null
  }

  const segments = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)

  if (!segments.length || segments[0] === 'auth' || segments[0] === 'audit-logs') {
    return null
  }

  const featureId = FEATURE_ID_BY_SEGMENT[segments[0]]

  if (!featureId) {
    return null
  }

  return {
    action: resolveAction(method, segments),
    featureId,
    resourceType: resolveResourceType(segments),
    resourceId: resolveResourceId(segments),
    requestPath: url.pathname,
    requestMethod: method,
  }
}

export async function readAuditPayload(request) {
  const contentType = request.headers.get('Content-Type') ?? ''

  if (!contentType.includes('application/json')) {
    return {
      resourceLabel: '',
      payloadJson: '',
    }
  }

  try {
    const rawBody = await request.clone().json()
    const sanitizedBody = sanitizeAuditValue(rawBody)
    const payloadJson = trimText(JSON.stringify(sanitizedBody), 4000)

    return {
      resourceLabel: extractSummaryValue(sanitizedBody),
      payloadJson,
    }
  } catch {
    return {
      resourceLabel: '',
      payloadJson: '',
    }
  }
}

async function resolveOperatorName(env, operatorUserId) {
  if (!operatorUserId) {
    return 'System'
  }

  const operator = await env.DB.prepare('SELECT name FROM users WHERE id = ?1 LIMIT 1').bind(operatorUserId).first()
  return trimText(operator?.name || 'System', 80)
}

export async function writeAuditLog(env, entry) {
  const operatorName = trimText(entry.operatorName || (await resolveOperatorName(env, entry.operatorUserId)), 80)

  await env.DB.prepare(
    `INSERT INTO audit_logs (
       id,
       feature_id,
       resource_type,
       action,
       resource_id,
       resource_label,
       operator_user_id,
       operator_name,
       request_path,
       request_method,
       payload_json
     )
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
  )
    .bind(
      crypto.randomUUID(),
      entry.featureId,
      entry.resourceType,
      entry.action,
      entry.resourceId || null,
      trimText(entry.resourceLabel, 120),
      entry.operatorUserId || null,
      operatorName,
      entry.requestPath,
      entry.requestMethod,
      entry.payloadJson || '',
    )
    .run()
}

function buildWhereClause(filters) {
  const clauses = []
  const bindings = []

  if (filters.action) {
    clauses.push(`al.action = ?${bindings.length + 1}`)
    bindings.push(filters.action)
  }

  if (filters.featureId) {
    clauses.push(`al.feature_id = ?${bindings.length + 1}`)
    bindings.push(filters.featureId)
  }

  if (filters.operatorUserId) {
    clauses.push(`al.operator_user_id = ?${bindings.length + 1}`)
    bindings.push(filters.operatorUserId)
  }

  if (filters.keyword) {
    clauses.push(
      `(
        lower(al.resource_type) LIKE lower(?${bindings.length + 1}) OR
        lower(coalesce(al.resource_id, '')) LIKE lower(?${bindings.length + 1}) OR
        lower(coalesce(al.resource_label, '')) LIKE lower(?${bindings.length + 1}) OR
        lower(coalesce(al.operator_name, '')) LIKE lower(?${bindings.length + 1}) OR
        lower(al.request_path) LIKE lower(?${bindings.length + 1}) OR
        lower(coalesce(al.payload_json, '')) LIKE lower(?${bindings.length + 1})
      )`,
    )
    bindings.push(`%${filters.keyword}%`)
  }

  if (filters.startDate) {
    clauses.push(`datetime(al.created_at) >= datetime(?${bindings.length + 1})`)
    bindings.push(filters.startDate)
  }

  if (filters.endDate) {
    clauses.push(`datetime(al.created_at) < datetime(?${bindings.length + 1}, '+1 day')`)
    bindings.push(filters.endDate)
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    bindings,
  }
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10)

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 200
  }

  return Math.min(parsed, 500)
}

export async function buildAuditLogPayload(env, filters = {}) {
  const { whereSql, bindings } = buildWhereClause(filters)
  const limit = normalizeLimit(filters.limit)

  const rowsQuery = `
    SELECT
      al.id,
      al.action,
      al.feature_id,
      COALESCE(f.title, al.feature_id) AS feature_title,
      al.resource_type,
      al.resource_id,
      al.resource_label,
      al.operator_user_id,
      CASE
        WHEN trim(al.operator_name) = '' THEN 'System'
        ELSE al.operator_name
      END AS operator_name,
      al.request_path,
      al.request_method,
      al.payload_json,
      al.created_at
    FROM audit_logs al
    LEFT JOIN features f ON f.id = al.feature_id
    ${whereSql}
    ORDER BY datetime(al.created_at) DESC, al.id DESC
    LIMIT ?${bindings.length + 1}
  `

  const rows = (await env.DB.prepare(rowsQuery).bind(...bindings, limit).all()).results ?? []

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM audit_logs al ${whereSql}`)
    .bind(...bindings)
    .first()

  const actionRows = (
    await env.DB.prepare(`SELECT al.action, COUNT(*) AS count FROM audit_logs al ${whereSql} GROUP BY al.action`)
      .bind(...bindings)
      .all()
  ).results ?? []

  const operatorCountRow = await env.DB.prepare(
    `SELECT COUNT(DISTINCT COALESCE(al.operator_user_id, al.operator_name)) AS total FROM audit_logs al ${whereSql}`,
  )
    .bind(...bindings)
    .first()

  const featureOptions = (
    await env.DB.prepare(
      `SELECT id, title
       FROM features
       WHERE id IN (SELECT DISTINCT feature_id FROM audit_logs)
       ORDER BY sort_order ASC, title ASC`,
    ).all()
  ).results ?? []

  const operatorOptions = (
    await env.DB.prepare(
      `SELECT DISTINCT
         COALESCE(operator_user_id, '') AS id,
         CASE WHEN trim(operator_name) = '' THEN 'System' ELSE operator_name END AS name
       FROM audit_logs
       ORDER BY name ASC`,
    ).all()
  ).results ?? []

  return {
    rows: rows.map((row) => ({
      id: row.id,
      action: row.action,
      featureId: row.feature_id,
      featureTitle: row.feature_title,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      resourceLabel: row.resource_label,
      operatorUserId: row.operator_user_id,
      operatorName: row.operator_name,
      requestPath: row.request_path,
      requestMethod: row.request_method,
      payloadJson: row.payload_json,
      createdAt: row.created_at,
    })),
    filterOptions: {
      actions: [
        { value: 'CREATE', label: 'CREATE' },
        { value: 'UPDATE', label: 'UPDATE' },
        { value: 'DELETE', label: 'DELETE' },
      ],
      features: featureOptions.map((feature) => ({
        value: feature.id,
        label: feature.title,
      })),
      operators: operatorOptions.map((operator) => ({
        value: operator.id,
        label: operator.name,
      })),
    },
    summary: {
      total: Number(totalRow?.total ?? 0),
      createCount: Number(actionRows.find((row) => row.action === 'CREATE')?.count ?? 0),
      updateCount: Number(actionRows.find((row) => row.action === 'UPDATE')?.count ?? 0),
      deleteCount: Number(actionRows.find((row) => row.action === 'DELETE')?.count ?? 0),
      operatorCount: Number(operatorCountRow?.total ?? 0),
    },
  }
}