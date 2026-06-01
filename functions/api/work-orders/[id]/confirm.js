import { requireFeatureAccess } from '../../_lib/access'
import {
  buildWorkOrderDetailPayload,
  buildWorkOrderMutationPayload,
  loadPersistedWorkOrderSpareParts,
  normalizeWorkOrderPhotoList,
  validateWorkOrderPhotoList,
  validateWorkOrderSparePartSelections,
} from '../../_lib/workOrders'
import { failure, readJson, success } from '../../_lib/http'
import { getSession } from '../../_lib/session'
import { normalizeOptionalText, normalizeText } from '../../_lib/equipment'

export async function onRequestPost({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'work-orders', failure)

  if (guard.error) {
    return guard.error
  }

  const workOrderId = normalizeText(params.id)
  const payload = await buildWorkOrderDetailPayload(env, workOrderId)

  if (!payload?.workOrder) {
    return failure('维修工单不存在。', 404)
  }

  if (payload.workOrder.confirmedAt) {
    return failure('当前维修工单已确认。')
  }

  if (!payload.workOrder.canConfirm) {
    return failure('只有在所有维修任务完成或取消后，才可以确认维修工单。')
  }

  const body = await readJson(request)
  const confirmedAt = normalizeOptionalText(body?.confirmedAt)
  const photos = normalizeWorkOrderPhotoList(body?.photos)

  if (!confirmedAt) {
    return failure('请填写维修工单确认时间。')
  }

  const photoValidation = validateWorkOrderPhotoList(photos)

  if (!photoValidation.ok) {
    return failure(photoValidation.message)
  }

  let normalizedSpareParts = null
  let normalizedSparePartMap = {}

  if (Array.isArray(body?.spareParts)) {
    const references = await validateWorkOrderSparePartSelections(env, workOrderId, body.spareParts)

    if (!references.ok) {
      return failure(references.message, references.status ?? 400)
    }

    normalizedSpareParts = references.items
    normalizedSparePartMap = references.sparePartMap
  }

  const sparePartsToDeduct = normalizedSpareParts
    ? normalizedSpareParts.map((item) => ({
        ...item,
        ...normalizedSparePartMap[item.sparePartId],
      }))
    : await loadPersistedWorkOrderSpareParts(env, workOrderId)

  for (const sparePart of sparePartsToDeduct) {
    if (sparePart.requiredQuantity > sparePart.stockQuantity) {
      return failure(`备件 ${sparePart.partNumber} 库存不足，无法确认当前维修工单。`)
    }
  }

  const statements = [
    ...(normalizedSpareParts
      ? [env.DB.prepare('DELETE FROM work_order_spare_parts WHERE work_order_id = ?1').bind(workOrderId)]
      : []),
    env.DB.prepare('DELETE FROM work_order_photos WHERE work_order_id = ?1').bind(workOrderId),
    ...(normalizedSpareParts
      ? normalizedSpareParts.map((sparePart) =>
          env.DB.prepare(
            `INSERT INTO work_order_spare_parts (work_order_id, spare_part_id, required_quantity, updated_at)
             VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)`,
          ).bind(workOrderId, sparePart.sparePartId, sparePart.requiredQuantity),
        )
      : []),
    ...photos.map((photo) =>
      env.DB.prepare(
        `INSERT INTO work_order_photos (id, work_order_id, file_name, photo_data, sort_order, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)`,
      ).bind(photo.id || crypto.randomUUID(), workOrderId, photo.fileName, photo.photoData, photo.sortOrder),
    ),
    ...sparePartsToDeduct.map((sparePart) =>
      env.DB.prepare(
        `UPDATE spare_parts
         SET stock_quantity = stock_quantity - ?1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?2`,
      ).bind(sparePart.requiredQuantity, sparePart.sparePartId),
    ),
    env.DB.prepare(
      `UPDATE work_orders
       SET confirmed_at = ?1,
           spare_parts_updated_at = CASE WHEN ?2 = 1 THEN CURRENT_TIMESTAMP ELSE spare_parts_updated_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3`,
    ).bind(confirmedAt, normalizedSpareParts ? 1 : 0, workOrderId),
  ]

  await env.DB.batch(statements)

  return success({
    ...(await buildWorkOrderMutationPayload(env, workOrderId, guard.session.userId)),
    message: '维修工单已确认。',
  })
}