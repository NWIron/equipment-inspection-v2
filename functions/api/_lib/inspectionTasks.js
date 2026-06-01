import { normalizeOptionalText, normalizeText } from './equipment'

export const TASK_PRIORITY_OPTIONS = ['低', '中', '高', '紧急']
export const TASK_STATUS_OPTIONS = ['待执行', '执行中', '已完成']
export const EDITABLE_TASK_STATUS_OPTIONS = ['待执行', '执行中']
export const TASK_RESULT_STATUS_OPTIONS = ['待检', '正常', '异常']

function buildPlaceholders(ids) {
  return ids.map((_, index) => `?${index + 1}`).join(', ')
}

function groupRows(rows, keyField) {
  return rows.reduce((lookup, row) => {
    lookup[row[keyField]] ??= []
    lookup[row[keyField]].push(row)
    return lookup
  }, {})
}

export function normalizeTaskPriority(value) {
  const normalized = normalizeText(value)
  return TASK_PRIORITY_OPTIONS.includes(normalized) ? normalized : '中'
}

export function normalizeEditableTaskStatus(value) {
  const normalized = normalizeText(value)
  return EDITABLE_TASK_STATUS_OPTIONS.includes(normalized) ? normalized : '待执行'
}

export function normalizeTaskResultStatus(value) {
  const normalized = normalizeText(value)
  return TASK_RESULT_STATUS_OPTIONS.includes(normalized) ? normalized : '待检'
}

export async function loadInspectorOptions(env) {
  const rows = (
    await env.DB.prepare(
      'SELECT id, name, account_name, email FROM users WHERE disabled = 0 ORDER BY account_name ASC',
    ).all()
  ).results ?? []

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    accountName: row.account_name,
    email: row.email,
  }))
}

export async function loadFaultCodeOptions(env) {
  const rows = (
    await env.DB.prepare('SELECT id, fault_code, description FROM fault_codes ORDER BY fault_code ASC').all()
  ).results ?? []

  return rows.map((row) => ({
    id: row.id,
    code: row.fault_code,
    description: row.description,
  }))
}

export async function loadEquipmentOptions(env, equipmentIds = null) {
  const hasFilter = Array.isArray(equipmentIds) && equipmentIds.length
  const placeholders = hasFilter ? buildPlaceholders(equipmentIds) : ''
  const equipmentQuery = [
    `SELECT equipment_assets.id,
            equipment_assets.equipment_code,
            equipment_assets.description,
            equipment_assets.owner_user_id,
            users.name AS owner_name
     FROM equipment_assets
     LEFT JOIN users ON users.id = equipment_assets.owner_user_id`,
    hasFilter ? `WHERE equipment_assets.id IN (${placeholders})` : '',
    'ORDER BY equipment_assets.equipment_code ASC',
  ]
    .filter(Boolean)
    .join(' ')

  const equipmentRows = (await env.DB.prepare(equipmentQuery).bind(...(equipmentIds ?? [])).all()).results ?? []

  if (!equipmentRows.length) {
    return []
  }

  const ids = equipmentRows.map((row) => row.id)
  const itemRows = (
    await env.DB.prepare(
      `SELECT equipment_task_lists.equipment_id,
              inspection_items.id AS inspection_item_id,
              inspection_items.item_code,
              inspection_items.description,
              task_list_items.sort_order
       FROM equipment_task_lists
       INNER JOIN task_list_items ON task_list_items.task_list_id = equipment_task_lists.task_list_id
       INNER JOIN inspection_items ON inspection_items.id = task_list_items.inspection_item_id
       WHERE equipment_task_lists.equipment_id IN (${buildPlaceholders(ids)})
       ORDER BY equipment_task_lists.equipment_id ASC, task_list_items.sort_order ASC, inspection_items.item_code ASC`,
    )
      .bind(...ids)
      .all()
  ).results ?? []

  const groupedItems = groupRows(itemRows, 'equipment_id')

  return equipmentRows.map((row) => {
    const seen = new Set()
    const inspectionItems = (groupedItems[row.id] ?? []).reduce((items, itemRow) => {
      if (seen.has(itemRow.inspection_item_id)) {
        return items
      }

      seen.add(itemRow.inspection_item_id)
      items.push({
        id: itemRow.inspection_item_id,
        code: itemRow.item_code,
        description: itemRow.description,
      })
      return items
    }, [])

    return {
      id: row.id,
      equipmentCode: row.equipment_code,
      description: row.description,
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name,
      inspectionItems,
    }
  })
}

export async function getEquipmentInspectionItems(env, equipmentId) {
  const [equipment] = await loadEquipmentOptions(env, [equipmentId])
  return equipment?.inspectionItems ?? []
}

async function loadTaskRows(env, taskIds = null) {
  const hasFilter = Array.isArray(taskIds) && taskIds.length
  const placeholders = hasFilter ? buildPlaceholders(taskIds) : ''
  const query = [
    `SELECT inspection_tasks.id,
          inspection_tasks.task_number,
            inspection_tasks.task_name,
            inspection_tasks.created_at,
            inspection_tasks.equipment_id,
            inspection_tasks.inspector_user_id,
            inspection_tasks.fault_code_id,
            inspection_tasks.fault_note,
            inspection_tasks.priority,
            inspection_tasks.status,
            inspection_tasks.completed_at
     FROM inspection_tasks`,
    hasFilter ? `WHERE inspection_tasks.id IN (${placeholders})` : '',
    'ORDER BY inspection_tasks.created_at DESC, inspection_tasks.task_name ASC',
  ]
    .filter(Boolean)
    .join(' ')

  return (await env.DB.prepare(query).bind(...(taskIds ?? [])).all()).results ?? []
}

async function loadInspectionTaskResults(env, taskIds) {
  if (!taskIds.length) {
    return {}
  }

  const rows = (
    await env.DB.prepare(
      `SELECT inspection_task_results.task_id,
              inspection_task_results.inspection_item_id,
              inspection_task_results.sort_order,
              inspection_task_results.result_status,
              inspection_task_results.remark,
              inspection_items.item_code,
              inspection_items.description
       FROM inspection_task_results
       INNER JOIN inspection_items ON inspection_items.id = inspection_task_results.inspection_item_id
       WHERE inspection_task_results.task_id IN (${buildPlaceholders(taskIds)})
       ORDER BY inspection_task_results.task_id ASC,
                inspection_task_results.sort_order ASC,
                inspection_items.item_code ASC`,
    )
      .bind(...taskIds)
      .all()
  ).results ?? []

  const grouped = groupRows(rows, 'task_id')

  return Object.fromEntries(
    Object.entries(grouped).map(([taskId, taskRows]) => [
      taskId,
      taskRows.map((row) => ({
        inspectionItemId: row.inspection_item_id,
        code: row.item_code,
        description: row.description,
        sortOrder: Number(row.sort_order ?? 0),
        resultStatus: row.result_status,
        remark: row.remark || '',
      })),
    ]),
  )
}

async function loadInspectionTaskPhotos(env, taskIds) {
  if (!taskIds.length) {
    return {}
  }

  const rows = (
    await env.DB.prepare(
      `SELECT inspection_task_photos.id,
              inspection_task_photos.task_id,
              inspection_task_photos.file_name,
              inspection_task_photos.photo_data,
              inspection_task_photos.sort_order,
              inspection_task_photos.created_at
       FROM inspection_task_photos
       WHERE inspection_task_photos.task_id IN (${buildPlaceholders(taskIds)})
       ORDER BY inspection_task_photos.task_id ASC,
                inspection_task_photos.sort_order ASC,
                inspection_task_photos.created_at ASC`,
    )
      .bind(...taskIds)
      .all()
  ).results ?? []

  const grouped = groupRows(rows, 'task_id')

  return Object.fromEntries(
    Object.entries(grouped).map(([taskId, taskRows]) => [
      taskId,
      taskRows.map((row) => ({
        id: row.id,
        fileName: row.file_name || '',
        photoData: row.photo_data,
        sortOrder: Number(row.sort_order ?? 0),
        createdAt: row.created_at,
      })),
    ]),
  )
}

function buildTaskPayloads(taskRows, equipmentOptions, inspectorOptions, faultCodes, resultLookup, currentUserId, photoLookup = {}) {
  const equipmentMap = Object.fromEntries(equipmentOptions.map((equipment) => [equipment.id, equipment]))
  const inspectorMap = Object.fromEntries(inspectorOptions.map((inspector) => [inspector.id, inspector]))
  const faultCodeMap = Object.fromEntries(faultCodes.map((faultCode) => [faultCode.id, faultCode]))

  return taskRows.map((row) => {
    const equipment = equipmentMap[row.equipment_id] ?? null
    const inspectionResults = resultLookup[row.id] ?? []
    const inspectionPhotos = photoLookup[row.id] ?? []
    const canComplete =
      row.status !== '已完成' &&
      currentUserId &&
      (row.inspector_user_id === currentUserId || equipment?.ownerUserId === currentUserId)

    return {
      id: row.id,
      taskNumber: row.task_number,
      taskName: row.task_name,
      createdAt: row.created_at,
      equipmentId: row.equipment_id,
      inspectorUserId: row.inspector_user_id,
      faultCodeId: row.fault_code_id,
      faultNote: row.fault_note || '',
      priority: row.priority,
      status: row.status,
      completedAt: row.completed_at,
      equipment,
      inspector: inspectorMap[row.inspector_user_id] ?? null,
      faultCode: row.fault_code_id ? faultCodeMap[row.fault_code_id] ?? null : null,
      inspectionPhotos,
      photoCount: inspectionPhotos.length,
      inspectionResults,
      inspectionItemCount: inspectionResults.length,
      abnormalCount: inspectionResults.filter((item) => item.resultStatus === '异常').length,
      canComplete: Boolean(canComplete),
    }
  })
}

export async function buildInspectionTaskBootstrapPayload(env, currentUserId = null) {
  const [equipmentOptions, inspectorOptions, faultCodes, taskRows] = await Promise.all([
    loadEquipmentOptions(env),
    loadInspectorOptions(env),
    loadFaultCodeOptions(env),
    loadTaskRows(env),
  ])
  const resultLookup = await loadInspectionTaskResults(
    env,
    taskRows.map((task) => task.id),
  )

  return {
    equipmentOptions,
    inspectorOptions,
    faultCodes,
    priorityOptions: TASK_PRIORITY_OPTIONS,
    statusOptions: EDITABLE_TASK_STATUS_OPTIONS,
    resultStatusOptions: TASK_RESULT_STATUS_OPTIONS,
    tasks: buildTaskPayloads(taskRows, equipmentOptions, inspectorOptions, faultCodes, resultLookup, currentUserId),
  }
}

export async function buildInspectionTaskDetailPayload(env, taskId, currentUserId = null) {
  const [equipmentOptions, inspectorOptions, faultCodes, taskRows] = await Promise.all([
    loadEquipmentOptions(env),
    loadInspectorOptions(env),
    loadFaultCodeOptions(env),
    loadTaskRows(env, [taskId]),
  ])

  if (!taskRows.length) {
    return null
  }

  const [resultLookup, photoLookup] = await Promise.all([
    loadInspectionTaskResults(env, [taskId]),
    loadInspectionTaskPhotos(env, [taskId]),
  ])

  return {
    equipmentOptions,
    inspectorOptions,
    faultCodes,
    priorityOptions: TASK_PRIORITY_OPTIONS,
    statusOptions: EDITABLE_TASK_STATUS_OPTIONS,
    resultStatusOptions: TASK_RESULT_STATUS_OPTIONS,
    task: buildTaskPayloads(
      taskRows,
      equipmentOptions,
      inspectorOptions,
      faultCodes,
      resultLookup,
      currentUserId,
      photoLookup,
    )[0],
  }
}

export async function validateInspectionTaskReferences(env, equipmentId, inspectorUserId, faultCodeId = null) {
  const [equipment] = await loadEquipmentOptions(env, [equipmentId])

  if (!equipment) {
    return { ok: false, message: '设备不存在，请重新选择。' }
  }

  const inspector = await env.DB.prepare('SELECT id FROM users WHERE id = ?1 AND disabled = 0 LIMIT 1')
    .bind(inspectorUserId)
    .first()

  if (!inspector) {
    return { ok: false, message: '点检员不存在或已禁用。' }
  }

  if (faultCodeId) {
    const faultCode = await env.DB.prepare('SELECT id FROM fault_codes WHERE id = ?1 LIMIT 1').bind(faultCodeId).first()

    if (!faultCode) {
      return { ok: false, message: '故障代码不存在。' }
    }
  }

  if (!equipment.inspectionItems.length) {
    return { ok: false, message: '当前设备未关联点检项，无法创建点检任务。' }
  }

  return { ok: true, equipment }
}

export async function loadExistingTaskResultMap(env, taskId) {
  const rows = (
    await env.DB.prepare(
      'SELECT inspection_item_id, result_status, remark FROM inspection_task_results WHERE task_id = ?1',
    )
      .bind(taskId)
      .all()
  ).results ?? []

  return rows.reduce((lookup, row) => {
    lookup[row.inspection_item_id] = {
      resultStatus: row.result_status,
      remark: row.remark || '',
    }
    return lookup
  }, {})
}

export async function generateInspectionTaskNumber(env, createdAt) {
  const normalizedDate = normalizeText(createdAt).replace(/[^0-9]/g, '').slice(0, 8)
  const dateToken = normalizedDate || new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `IT-${dateToken}-`
  const latest = await env.DB.prepare(
    `SELECT task_number
     FROM inspection_tasks
     WHERE task_number LIKE ?1
     ORDER BY task_number DESC
     LIMIT 1`,
  )
    .bind(`${prefix}%`)
    .first()

  const currentSequence = latest?.task_number ? Number.parseInt(String(latest.task_number).slice(-3), 10) : 0
  const nextSequence = Number.isInteger(currentSequence) ? currentSequence + 1 : 1

  return `${prefix}${String(nextSequence).padStart(3, '0')}`
}

export function normalizeInspectionTaskBody(body) {
  return {
    taskName: normalizeText(body?.taskName),
    createdAt: normalizeOptionalText(body?.createdAt) ?? new Date().toISOString(),
    equipmentId: normalizeText(body?.equipmentId),
    inspectorUserId: normalizeText(body?.inspectorUserId),
    faultCodeId: normalizeOptionalText(body?.faultCodeId),
    faultNote: normalizeOptionalText(body?.faultNote) ?? '',
    priority: normalizeTaskPriority(body?.priority),
    status: normalizeEditableTaskStatus(body?.status),
  }
}