import { requireFeatureAccess } from '../_lib/access'
import { buildEquipmentPayload, normalizeOptionalText, normalizeText, parseWholeNumber } from '../_lib/equipment'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'

function normalizeIdList(value) {
  return Array.from(new Set(Array.isArray(value) ? value.map(normalizeText).filter(Boolean) : []))
}

export async function onRequestPost({ env, request }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'equipment', failure)

  if (guard.error) {
    return guard.error
  }

  const body = await readJson(request)
  const equipmentCode = normalizeText(body?.equipmentCode)
  const description = normalizeText(body?.description)
  const status = normalizeText(body?.status)
  const validUntil = normalizeOptionalText(body?.validUntil)
  const type = normalizeOptionalText(body?.type)
  const model = normalizeOptionalText(body?.model)
  const location = normalizeText(body?.location)
  const ownerUserId = normalizeText(body?.ownerUserId)
  const contactInfo = normalizeOptionalText(body?.contactInfo)
  const purchaseDate = normalizeOptionalText(body?.purchaseDate)
  const commissioningDate = normalizeOptionalText(body?.commissioningDate)
  const serviceLife = normalizeOptionalText(body?.serviceLife)
  const inspectionFrequencyDays = parseWholeNumber(body?.inspectionFrequencyDays)
  const taskListIds = normalizeIdList(body?.taskListIds)
  const sparePartIds = normalizeIdList(body?.sparePartIds)

  if (!equipmentCode || !description || !status || !location || !ownerUserId) {
    return failure('请完整填写设备主数据。')
  }

  if (!Number.isInteger(inspectionFrequencyDays) || inspectionFrequencyDays < 1) {
    return failure('点检频率必须为大于 0 的天数。')
  }

  const existingEquipment = await env.DB.prepare(
    'SELECT id FROM equipment_assets WHERE equipment_code = ?1 LIMIT 1',
  )
    .bind(equipmentCode)
    .first()

  if (existingEquipment) {
    return failure('设备编号已存在。')
  }

  const owner = await env.DB.prepare('SELECT id FROM users WHERE id = ?1 LIMIT 1').bind(ownerUserId).first()

  if (!owner) {
    return failure('责任人不存在，请重新选择。')
  }

  const equipmentId = crypto.randomUUID()

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO equipment_assets (
         id, equipment_code, description, status, valid_until, type, model, location, owner_user_id,
         contact_info, purchase_date, commissioning_date, service_life, inspection_frequency_days
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
    ).bind(
      equipmentId,
      equipmentCode,
      description,
      status,
      validUntil,
      type,
      model,
      location,
      ownerUserId,
      contactInfo,
      purchaseDate,
      commissioningDate,
      serviceLife,
      inspectionFrequencyDays,
    ),
    ...taskListIds.map((taskListId) =>
      env.DB.prepare('INSERT INTO equipment_task_lists (equipment_id, task_list_id) VALUES (?1, ?2)').bind(
        equipmentId,
        taskListId,
      ),
    ),
    ...sparePartIds.map((sparePartId) =>
      env.DB.prepare('INSERT INTO equipment_spare_parts (equipment_id, spare_part_id) VALUES (?1, ?2)').bind(
        equipmentId,
        sparePartId,
      ),
    ),
  ])

  return success(
    {
      ...(await buildEquipmentPayload(env)),
      message: '设备主数据已创建。',
    },
    { status: 201 },
  )
}