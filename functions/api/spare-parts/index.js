import { requireFeatureAccess } from '../_lib/access'
import { buildEquipmentPayload, normalizeText, parseWholeNumber } from '../_lib/equipment'
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
  const partNumber = normalizeText(body?.partNumber)
  const description = normalizeText(body?.description)
  const unit = normalizeText(body?.unit) || '件'
  const stockQuantity = parseWholeNumber(body?.stockQuantity)
  const safetyStock = parseWholeNumber(body?.safetyStock)
  const equipmentIds = normalizeIdList(body?.equipmentIds)

  if (!partNumber || !description) {
    return failure('请完整填写备件主数据。')
  }

  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    return failure('库存数量必须为大于或等于 0 的整数。')
  }

  if (!Number.isInteger(safetyStock) || safetyStock < 0) {
    return failure('安全库存必须为大于或等于 0 的整数。')
  }

  const existing = await env.DB.prepare('SELECT id FROM spare_parts WHERE part_number = ?1 LIMIT 1')
    .bind(partNumber)
    .first()

  if (existing) {
    return failure('备件编号已存在。')
  }

  const sparePartId = crypto.randomUUID()

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO spare_parts (id, part_number, description, unit, stock_quantity, safety_stock) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
    ).bind(sparePartId, partNumber, description, unit, stockQuantity, safetyStock),
    ...equipmentIds.map((equipmentId) =>
      env.DB.prepare('INSERT INTO equipment_spare_parts (equipment_id, spare_part_id) VALUES (?1, ?2)').bind(
        equipmentId,
        sparePartId,
      ),
    ),
  ])

  return success(
    {
      ...(await buildEquipmentPayload(env)),
      message: '备件已创建。',
    },
    { status: 201 },
  )
}