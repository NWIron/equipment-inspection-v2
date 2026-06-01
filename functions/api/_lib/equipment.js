function toLookup(rows, sourceKey, targetKey) {
  return rows.reduce((lookup, row) => {
    lookup[row[sourceKey]] ??= []
    lookup[row[sourceKey]].push(row[targetKey])
    return lookup
  }, {})
}

function buildPlaceholders(ids) {
  return ids.map((_, index) => `?${index + 1}`).join(', ')
}

export function normalizeText(value) {
  return String(value ?? '').trim()
}

export function normalizeOptionalText(value) {
  const normalized = normalizeText(value)
  return normalized || null
}

export function parseWholeNumber(value) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return null
  }

  const parsed = Number.parseInt(normalized, 10)
  return Number.isInteger(parsed) ? parsed : Number.NaN
}

async function loadOwnerOptions(env) {
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

async function loadInspectionItems(env) {
  const rows = (
    await env.DB.prepare(
      'SELECT id, item_code, description FROM inspection_items ORDER BY item_code ASC',
    ).all()
  ).results ?? []

  return rows.map((row) => ({
    id: row.id,
    code: row.item_code,
    description: row.description,
  }))
}

async function loadFaultCodes(env) {
  const rows = (
    await env.DB.prepare(
      'SELECT id, fault_code, description FROM fault_codes ORDER BY fault_code ASC',
    ).all()
  ).results ?? []

  return rows.map((row) => ({
    id: row.id,
    code: row.fault_code,
    description: row.description,
  }))
}

async function loadTaskLists(env) {
  const rows = (
    await env.DB.prepare(
      'SELECT id, task_list_code, description FROM task_lists ORDER BY task_list_code ASC',
    ).all()
  ).results ?? []

  if (!rows.length) {
    return []
  }

  const relationRows = (
    await env.DB.prepare(
      `SELECT task_list_id, inspection_item_id
       FROM task_list_items
       WHERE task_list_id IN (${buildPlaceholders(rows)})
       ORDER BY sort_order ASC, created_at ASC`,
    )
      .bind(...rows.map((row) => row.id))
      .all()
  ).results ?? []

  const itemLookup = toLookup(relationRows, 'task_list_id', 'inspection_item_id')

  return rows.map((row) => ({
    id: row.id,
    code: row.task_list_code,
    description: row.description,
    inspectionItemIds: itemLookup[row.id] ?? [],
  }))
}

async function loadSpareParts(env) {
  const rows = (
    await env.DB.prepare(
      'SELECT id, part_number, description, unit, stock_quantity, safety_stock FROM spare_parts ORDER BY part_number ASC',
    ).all()
  ).results ?? []

  if (!rows.length) {
    return []
  }

  const relationRows = (
    await env.DB.prepare(
      `SELECT spare_part_id, equipment_id
       FROM equipment_spare_parts
       WHERE spare_part_id IN (${buildPlaceholders(rows)})
       ORDER BY equipment_id ASC`,
    )
      .bind(...rows.map((row) => row.id))
      .all()
  ).results ?? []

  const equipmentLookup = toLookup(relationRows, 'spare_part_id', 'equipment_id')

  return rows.map((row) => ({
    id: row.id,
    partNumber: row.part_number,
    description: row.description,
    unit: row.unit,
    stockQuantity: Number(row.stock_quantity ?? 0),
    safetyStock: Number(row.safety_stock ?? 0),
    equipmentIds: equipmentLookup[row.id] ?? [],
  }))
}

async function loadEquipment(env) {
  const rows = (
    await env.DB.prepare(
      `SELECT id, equipment_code, description, status, valid_until, type, model, location, owner_user_id,
              contact_info, purchase_date, commissioning_date, service_life, inspection_frequency_days
       FROM equipment_assets
       ORDER BY equipment_code ASC`,
    ).all()
  ).results ?? []

  if (!rows.length) {
    return []
  }

  const equipmentIds = rows.map((row) => row.id)
  const taskListRows = (
    await env.DB.prepare(
      `SELECT equipment_id, task_list_id
       FROM equipment_task_lists
       WHERE equipment_id IN (${buildPlaceholders(equipmentIds)})
       ORDER BY task_list_id ASC`,
    )
      .bind(...equipmentIds)
      .all()
  ).results ?? []

  const sparePartRows = (
    await env.DB.prepare(
      `SELECT equipment_id, spare_part_id
       FROM equipment_spare_parts
       WHERE equipment_id IN (${buildPlaceholders(equipmentIds)})
       ORDER BY spare_part_id ASC`,
    )
      .bind(...equipmentIds)
      .all()
  ).results ?? []

  const taskListLookup = toLookup(taskListRows, 'equipment_id', 'task_list_id')
  const sparePartLookup = toLookup(sparePartRows, 'equipment_id', 'spare_part_id')

  return rows.map((row) => ({
    id: row.id,
    equipmentCode: row.equipment_code,
    description: row.description,
    status: row.status,
    validUntil: row.valid_until,
    type: row.type,
    model: row.model,
    location: row.location,
    ownerUserId: row.owner_user_id,
    contactInfo: row.contact_info,
    purchaseDate: row.purchase_date,
    commissioningDate: row.commissioning_date,
    serviceLife: row.service_life,
    inspectionFrequencyDays: Number(row.inspection_frequency_days ?? 0),
    taskListIds: taskListLookup[row.id] ?? [],
    sparePartIds: sparePartLookup[row.id] ?? [],
  }))
}

export async function buildEquipmentPayload(env) {
  const [ownerOptions, inspectionItems, faultCodes, taskLists, spareParts, equipments] = await Promise.all([
    loadOwnerOptions(env),
    loadInspectionItems(env),
    loadFaultCodes(env),
    loadTaskLists(env),
    loadSpareParts(env),
    loadEquipment(env),
  ])

  return {
    ownerOptions,
    inspectionItems,
    faultCodes,
    taskLists,
    spareParts,
    equipments,
  }
}