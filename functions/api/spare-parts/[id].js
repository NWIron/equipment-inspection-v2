import { requireFeatureAccess } from '../_lib/access'
import { buildEquipmentPayload, normalizeText, parseWholeNumber } from '../_lib/equipment'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'

function normalizeIdList(value) {
  return Array.from(new Set(Array.isArray(value) ? value.map(normalizeText).filter(Boolean) : []))
}

export async function onRequestPut({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'equipment', failure)

  if (guard.error) {
    return guard.error
  }

  const sparePartId = normalizeText(params.id)
  const target = await env.DB.prepare('SELECT id FROM spare_parts WHERE id = ?1 LIMIT 1')
    .bind(sparePartId)
    .first()

  if (!target) {
    return failure('备件不存在。', 404)
  }

  const body = await readJson(request)
  const partNumber = normalizeText(body?.partNumber)
  const description = normalizeText(body?.description)
  const unit = normalizeText(body?.unit) || '件'
  const stockQuantity = parseWholeNumber(body?.stockQuantity)
  const equipmentIds = normalizeIdList(body?.equipmentIds)

  if (!partNumber || !description) {
    return failure('请完整填写备件主数据。')
  }

  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    return failure('库存数量必须为大于或等于 0 的整数。')
  }

  const existing = await env.DB.prepare(
    'SELECT id FROM spare_parts WHERE part_number = ?1 AND id <> ?2 LIMIT 1',
  )
    .bind(partNumber, sparePartId)
    .first()

  if (existing) {
    return failure('备件编号已存在。')
  }

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE spare_parts
       SET part_number = ?1, description = ?2, unit = ?3, stock_quantity = ?4, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?5`,
    ).bind(partNumber, description, unit, stockQuantity, sparePartId),
    env.DB.prepare('DELETE FROM equipment_spare_parts WHERE spare_part_id = ?1').bind(sparePartId),
    ...equipmentIds.map((equipmentId) =>
      env.DB.prepare('INSERT INTO equipment_spare_parts (equipment_id, spare_part_id) VALUES (?1, ?2)').bind(
        equipmentId,
        sparePartId,
      ),
    ),
  ])

  return success({
    ...(await buildEquipmentPayload(env)),
    message: '备件已更新。',
  })
}

export async function onRequestDelete({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'equipment', failure)

  if (guard.error) {
    return guard.error
  }

  const sparePartId = normalizeText(params.id)
  const target = await env.DB.prepare('SELECT id FROM spare_parts WHERE id = ?1 LIMIT 1')
    .bind(sparePartId)
    .first()

  if (!target) {
    return failure('备件不存在。', 404)
  }

  await env.DB.prepare('DELETE FROM spare_parts WHERE id = ?1').bind(sparePartId).run()

  return success({
    ...(await buildEquipmentPayload(env)),
    message: '备件已删除。',
  })
}