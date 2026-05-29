import { normalizeOptionalText, normalizeText } from './equipment'
import { TASK_PRIORITY_OPTIONS, normalizeTaskPriority } from './inspectionTasks'

export const WORK_ORDER_TASK_STATUS_OPTIONS = ['进行中', '完成', '待验收', '取消']

const TERMINAL_TASK_STATUSES = new Set(['完成', '取消'])

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

function buildCreatorContact(user) {
  if (!user) {
    return ''
  }

  return `${user.name} / ${user.phone}`
}

function buildDraftDateTime() {
  return new Date().toISOString().slice(0, 16)
}

function getWorkOrderStatus(tasks, confirmedAt) {
  if (confirmedAt) {
    return '已确认'
  }

  if (!tasks.length) {
    return '待派工'
  }

  if (tasks.every((task) => TERMINAL_TASK_STATUSES.has(task.status))) {
    return '待确认'
  }

  if (tasks.some((task) => task.status === '待验收')) {
    return '待验收'
  }

  if (tasks.some((task) => task.status === '进行中')) {
    return '维修中'
  }

  return '处理中'
}

export function normalizeWorkOrderTaskStatus(value) {
  const normalized = normalizeText(value)
  return WORK_ORDER_TASK_STATUS_OPTIONS.includes(normalized) ? normalized : '进行中'
}

export function normalizeWorkOrderBody(body) {
  return {
    equipmentId: normalizeText(body?.equipmentId),
    faultCodeId: normalizeOptionalText(body?.faultCodeId),
    priority: normalizeTaskPriority(body?.priority),
    createdAt: normalizeOptionalText(body?.createdAt) ?? new Date().toISOString(),
    createdByUserId: normalizeText(body?.createdByUserId),
    sourceInspectionTaskId: normalizeOptionalText(body?.sourceInspectionTaskId),
  }
}

export function normalizeWorkOrderTaskBody(body) {
  return {
    taskName: normalizeText(body?.taskName),
    engineerUserId: normalizeText(body?.engineerUserId),
    status: normalizeWorkOrderTaskStatus(body?.status),
  }
}

export async function loadWorkOrderEquipmentOptions(env, equipmentIds = null) {
  const hasFilter = Array.isArray(equipmentIds) && equipmentIds.length
  const placeholders = hasFilter ? buildPlaceholders(equipmentIds) : ''
  const query = [
    `SELECT id, equipment_code, description, location
     FROM equipment_assets`,
    hasFilter ? `WHERE id IN (${placeholders})` : '',
    'ORDER BY equipment_code ASC',
  ]
    .filter(Boolean)
    .join(' ')

  const rows = (await env.DB.prepare(query).bind(...(equipmentIds ?? [])).all()).results ?? []

  return rows.map((row) => ({
    id: row.id,
    equipmentCode: row.equipment_code,
    description: row.description,
    location: row.location || '',
  }))
}

export async function loadWorkOrderCreatorOptions(env, userIds = null) {
  const hasFilter = Array.isArray(userIds) && userIds.length
  const placeholders = hasFilter ? buildPlaceholders(userIds) : ''
  const query = [
    `SELECT id, account_name, name, email, phone
     FROM users
     WHERE disabled = 0`,
    hasFilter ? `AND id IN (${placeholders})` : '',
    'ORDER BY account_name ASC',
  ]
    .filter(Boolean)
    .join(' ')

  const rows = (await env.DB.prepare(query).bind(...(userIds ?? [])).all()).results ?? []

  return rows.map((row) => ({
    id: row.id,
    accountName: row.account_name,
    name: row.name,
    email: row.email,
    phone: row.phone,
    contactLabel: buildCreatorContact(row),
  }))
}

export async function loadWorkOrderEngineerOptions(env, userIds = null) {
  const hasFilter = Array.isArray(userIds) && userIds.length
  const placeholders = hasFilter ? buildPlaceholders(userIds) : ''
  const query = [
    `SELECT DISTINCT users.id, users.account_name, users.name, users.email, users.phone
     FROM users
     INNER JOIN user_roles ON user_roles.user_id = users.id
     INNER JOIN role_features ON role_features.role_id = user_roles.role_id
     WHERE users.disabled = 0 AND role_features.feature_id = 'work-orders'`,
    hasFilter ? `AND users.id IN (${placeholders})` : '',
    'ORDER BY users.account_name ASC',
  ]
    .filter(Boolean)
    .join(' ')

  const rows = (await env.DB.prepare(query).bind(...(userIds ?? [])).all()).results ?? []

  return rows.map((row) => ({
    id: row.id,
    accountName: row.account_name,
    name: row.name,
    email: row.email,
    phone: row.phone,
    contactLabel: buildCreatorContact(row),
  }))
}

export async function loadWorkOrderFaultCodeOptions(env) {
  const rows = (
    await env.DB.prepare('SELECT id, fault_code, description FROM fault_codes ORDER BY fault_code ASC').all()
  ).results ?? []

  return rows.map((row) => ({
    id: row.id,
    code: row.fault_code,
    description: row.description,
  }))
}

async function loadInspectionTaskSummaries(env, taskIds) {
  if (!taskIds.length) {
    return {}
  }

  const rows = (
    await env.DB.prepare(
      `SELECT inspection_tasks.id,
              inspection_tasks.task_name,
              inspection_tasks.equipment_id,
              inspection_tasks.fault_code_id,
              inspection_tasks.priority,
              equipment_assets.equipment_code,
              equipment_assets.description AS equipment_description,
              equipment_assets.location AS equipment_location
       FROM inspection_tasks
       INNER JOIN equipment_assets ON equipment_assets.id = inspection_tasks.equipment_id
       WHERE inspection_tasks.id IN (${buildPlaceholders(taskIds)})`,
    )
      .bind(...taskIds)
      .all()
  ).results ?? []

  return Object.fromEntries(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        taskName: row.task_name,
        equipmentId: row.equipment_id,
        faultCodeId: row.fault_code_id,
        priority: row.priority,
        equipmentCode: row.equipment_code,
        equipmentDescription: row.equipment_description,
        equipmentLocation: row.equipment_location || '',
      },
    ]),
  )
}

async function loadWorkOrderRows(env, workOrderIds = null) {
  const hasFilter = Array.isArray(workOrderIds) && workOrderIds.length
  const placeholders = hasFilter ? buildPlaceholders(workOrderIds) : ''
  const query = [
    `SELECT id,
            order_number,
            source_inspection_task_id,
            equipment_id,
            fault_code_id,
            priority,
            created_at,
            created_by_user_id,
            creator_contact,
            confirmed_at
     FROM work_orders`,
    hasFilter ? `WHERE id IN (${placeholders})` : '',
    'ORDER BY created_at DESC, order_number DESC',
  ]
    .filter(Boolean)
    .join(' ')

  return (await env.DB.prepare(query).bind(...(workOrderIds ?? [])).all()).results ?? []
}

async function loadWorkOrderTaskRows(env, workOrderIds) {
  if (!workOrderIds.length) {
    return {}
  }

  const rows = (
    await env.DB.prepare(
      `SELECT work_order_tasks.id,
              work_order_tasks.work_order_id,
              work_order_tasks.task_name,
              work_order_tasks.engineer_user_id,
              work_order_tasks.status,
              work_order_tasks.created_at,
              work_order_tasks.updated_at,
              users.name AS engineer_name,
              users.account_name AS engineer_account_name,
              users.email AS engineer_email,
              users.phone AS engineer_phone
       FROM work_order_tasks
       INNER JOIN users ON users.id = work_order_tasks.engineer_user_id
       WHERE work_order_tasks.work_order_id IN (${buildPlaceholders(workOrderIds)})
       ORDER BY work_order_tasks.created_at ASC, work_order_tasks.task_name ASC`,
    )
      .bind(...workOrderIds)
      .all()
  ).results ?? []

  const grouped = groupRows(rows, 'work_order_id')

  return Object.fromEntries(
    Object.entries(grouped).map(([workOrderId, taskRows]) => [
      workOrderId,
      taskRows.map((row) => ({
        id: row.id,
        taskName: row.task_name,
        engineerUserId: row.engineer_user_id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        engineer: {
          id: row.engineer_user_id,
          name: row.engineer_name,
          accountName: row.engineer_account_name,
          email: row.engineer_email,
          phone: row.engineer_phone,
          contactLabel: `${row.engineer_name} / ${row.engineer_phone}`,
        },
      })),
    ]),
  )
}

function buildWorkOrderPayloads(workOrderRows, equipmentOptions, creatorOptions, engineerOptions, faultCodes, sourceTasks, taskLookup) {
  const equipmentMap = Object.fromEntries(equipmentOptions.map((equipment) => [equipment.id, equipment]))
  const creatorMap = Object.fromEntries(creatorOptions.map((creator) => [creator.id, creator]))
  const engineerMap = Object.fromEntries(engineerOptions.map((engineer) => [engineer.id, engineer]))
  const faultCodeMap = Object.fromEntries(faultCodes.map((faultCode) => [faultCode.id, faultCode]))

  return workOrderRows.map((row) => {
    const tasks = (taskLookup[row.id] ?? []).map((task) => ({
      ...task,
      engineer: engineerMap[task.engineerUserId] ?? task.engineer,
    }))
    const allTasksTerminal = tasks.length > 0 && tasks.every((task) => TERMINAL_TASK_STATUSES.has(task.status))

    return {
      id: row.id,
      orderNumber: row.order_number,
      sourceInspectionTaskId: row.source_inspection_task_id,
      equipmentId: row.equipment_id,
      faultCodeId: row.fault_code_id,
      priority: row.priority,
      createdAt: row.created_at,
      createdByUserId: row.created_by_user_id,
      creatorContact: row.creator_contact || '',
      confirmedAt: row.confirmed_at,
      status: getWorkOrderStatus(tasks, row.confirmed_at),
      equipment: equipmentMap[row.equipment_id] ?? null,
      faultCode: row.fault_code_id ? faultCodeMap[row.fault_code_id] ?? null : null,
      creator: creatorMap[row.created_by_user_id] ?? null,
      sourceInspectionTask: row.source_inspection_task_id ? sourceTasks[row.source_inspection_task_id] ?? null : null,
      tasks,
      taskCount: tasks.length,
      finishedTaskCount: tasks.filter((task) => TERMINAL_TASK_STATUSES.has(task.status)).length,
      canDelete: !row.confirmed_at && (tasks.length === 0 || allTasksTerminal),
      canConfirm: !row.confirmed_at && allTasksTerminal,
    }
  })
}

async function buildDraftWorkOrder(env, currentUserId, sourceTaskId = null) {
  const creators = await loadWorkOrderCreatorOptions(env, currentUserId ? [currentUserId] : null)
  const creator = creators[0] ?? null

  let sourceInspectionTask = null

  if (sourceTaskId) {
    const lookup = await loadInspectionTaskSummaries(env, [sourceTaskId])
    sourceInspectionTask = lookup[sourceTaskId] ?? null

    if (!sourceInspectionTask) {
      return { draftWorkOrder: null, sourceTaskMissing: true }
    }
  }

  return {
    draftWorkOrder: {
      equipmentId: sourceInspectionTask?.equipmentId ?? '',
      faultCodeId: sourceInspectionTask?.faultCodeId ?? '',
      priority: sourceInspectionTask?.priority ?? TASK_PRIORITY_OPTIONS[1] ?? '中',
      createdAt: buildDraftDateTime(),
      createdByUserId: creator?.id ?? '',
      creatorContact: creator?.contactLabel ?? '',
      sourceInspectionTaskId: sourceInspectionTask?.id ?? '',
      sourceInspectionTask,
    },
    sourceTaskMissing: false,
  }
}

export async function buildWorkOrderBootstrapPayload(env, currentUserId = null, sourceTaskId = null) {
  const [
    equipmentOptions,
    creatorOptions,
    engineerOptions,
    faultCodes,
    workOrderRows,
    draftData,
  ] = await Promise.all([
    loadWorkOrderEquipmentOptions(env),
    loadWorkOrderCreatorOptions(env),
    loadWorkOrderEngineerOptions(env),
    loadWorkOrderFaultCodeOptions(env),
    loadWorkOrderRows(env),
    buildDraftWorkOrder(env, currentUserId, sourceTaskId),
  ])

  const taskLookup = await loadWorkOrderTaskRows(
    env,
    workOrderRows.map((row) => row.id),
  )
  const sourceTaskLookup = await loadInspectionTaskSummaries(
    env,
    workOrderRows.map((row) => row.source_inspection_task_id).filter(Boolean),
  )

  return {
    equipmentOptions,
    creatorOptions,
    engineerOptions,
    faultCodes,
    priorityOptions: TASK_PRIORITY_OPTIONS,
    taskStatusOptions: WORK_ORDER_TASK_STATUS_OPTIONS,
    workOrders: buildWorkOrderPayloads(
      workOrderRows,
      equipmentOptions,
      creatorOptions,
      engineerOptions,
      faultCodes,
      sourceTaskLookup,
      taskLookup,
    ),
    draftWorkOrder: draftData.draftWorkOrder,
    sourceTaskMissing: draftData.sourceTaskMissing,
  }
}

export async function buildWorkOrderDetailPayload(env, workOrderId) {
  const [workOrderRows, equipmentOptions, creatorOptions, engineerOptions, faultCodes] = await Promise.all([
    loadWorkOrderRows(env, [workOrderId]),
    loadWorkOrderEquipmentOptions(env),
    loadWorkOrderCreatorOptions(env),
    loadWorkOrderEngineerOptions(env),
    loadWorkOrderFaultCodeOptions(env),
  ])

  if (!workOrderRows.length) {
    return null
  }

  const taskLookup = await loadWorkOrderTaskRows(env, [workOrderId])
  const sourceTaskLookup = await loadInspectionTaskSummaries(
    env,
    workOrderRows.map((row) => row.source_inspection_task_id).filter(Boolean),
  )

  return {
    equipmentOptions,
    creatorOptions,
    engineerOptions,
    faultCodes,
    priorityOptions: TASK_PRIORITY_OPTIONS,
    taskStatusOptions: WORK_ORDER_TASK_STATUS_OPTIONS,
    workOrder: buildWorkOrderPayloads(
      workOrderRows,
      equipmentOptions,
      creatorOptions,
      engineerOptions,
      faultCodes,
      sourceTaskLookup,
      taskLookup,
    )[0],
  }
}

export async function buildWorkOrderMutationPayload(env, workOrderId, currentUserId = null) {
  const [bootstrap, detail] = await Promise.all([
    buildWorkOrderBootstrapPayload(env, currentUserId),
    buildWorkOrderDetailPayload(env, workOrderId),
  ])

  return {
    ...bootstrap,
    workOrder: detail?.workOrder ?? null,
  }
}

export async function validateWorkOrderReferences(
  env,
  equipmentId,
  faultCodeId,
  createdByUserId,
  sourceInspectionTaskId = null,
) {
  const [equipment] = await loadWorkOrderEquipmentOptions(env, [equipmentId])

  if (!equipment) {
    return { ok: false, message: '设备不存在，请重新选择。' }
  }

  const [creator] = await loadWorkOrderCreatorOptions(env, [createdByUserId])

  if (!creator) {
    return { ok: false, message: '创建人不存在或已禁用。' }
  }

  if (faultCodeId) {
    const faultCode = await env.DB.prepare('SELECT id FROM fault_codes WHERE id = ?1 LIMIT 1').bind(faultCodeId).first()

    if (!faultCode) {
      return { ok: false, message: '故障代码不存在。' }
    }
  }

  let sourceInspectionTask = null

  if (sourceInspectionTaskId) {
    const sourceLookup = await loadInspectionTaskSummaries(env, [sourceInspectionTaskId])
    sourceInspectionTask = sourceLookup[sourceInspectionTaskId] ?? null

    if (!sourceInspectionTask) {
      return { ok: false, message: '来源点检任务不存在。' }
    }
  }

  return {
    ok: true,
    equipment,
    creator,
    sourceInspectionTask,
  }
}

export async function validateWorkOrderTaskReferences(env, workOrderId, engineerUserId) {
  const workOrder = await env.DB.prepare('SELECT id, confirmed_at FROM work_orders WHERE id = ?1 LIMIT 1').bind(workOrderId).first()

  if (!workOrder) {
    return { ok: false, message: '维修工单不存在。', status: 404 }
  }

  if (workOrder.confirmed_at) {
    return { ok: false, message: '已确认的维修工单不可再修改任务。' }
  }

  const [engineer] = await loadWorkOrderEngineerOptions(env, [engineerUserId])

  if (!engineer) {
    return { ok: false, message: '维修工程师不存在或未授权维修工单模块。' }
  }

  return {
    ok: true,
    workOrder,
    engineer,
  }
}

export async function generateWorkOrderNumber(env, createdAt) {
  const normalizedDate = normalizeText(createdAt).replace(/[^0-9]/g, '').slice(0, 8)
  const dateToken = normalizedDate || new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `WO-${dateToken}-`
  const latest = await env.DB.prepare(
    `SELECT order_number
     FROM work_orders
     WHERE order_number LIKE ?1
     ORDER BY order_number DESC
     LIMIT 1`,
  )
    .bind(`${prefix}%`)
    .first()

  const currentSequence = latest?.order_number ? Number.parseInt(String(latest.order_number).slice(-3), 10) : 0
  const nextSequence = Number.isInteger(currentSequence) ? currentSequence + 1 : 1

  return `${prefix}${String(nextSequence).padStart(3, '0')}`
}