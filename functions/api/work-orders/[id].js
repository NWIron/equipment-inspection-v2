import { requireFeatureAccess } from '../_lib/access'
import {
  buildWorkOrderBootstrapPayload,
  buildWorkOrderDetailPayload,
  buildWorkOrderMutationPayload,
  normalizeWorkOrderBody,
  validateWorkOrderReferences,
} from '../_lib/workOrders'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'
import { normalizeText } from '../_lib/equipment'

async function loadWorkOrderRecord(env, workOrderId) {
  return env.DB.prepare('SELECT id, equipment_id, spare_parts_updated_at, confirmed_at FROM work_orders WHERE id = ?1 LIMIT 1')
    .bind(workOrderId)
    .first()
}

export async function onRequestGet({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'work-orders', failure)

  if (guard.error) {
    return guard.error
  }

  const workOrderId = normalizeText(params.id)
  const payload = await buildWorkOrderDetailPayload(env, workOrderId)

  if (!payload) {
    return failure('维修工单不存在。', 404)
  }

  return success(payload)
}

export async function onRequestPut({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'work-orders', failure)

  if (guard.error) {
    return guard.error
  }

  const workOrderId = normalizeText(params.id)
  const existingWorkOrder = await loadWorkOrderRecord(env, workOrderId)

  if (!existingWorkOrder) {
    return failure('维修工单不存在。', 404)
  }

  if (existingWorkOrder.confirmed_at) {
    return failure('已确认的维修工单不可再修改主数据。')
  }

  const body = normalizeWorkOrderBody(await readJson(request))

  if (!body.equipmentId || !body.createdByUserId) {
    return failure('请完整填写维修工单主数据。')
  }

  const references = await validateWorkOrderReferences(
    env,
    body.equipmentId,
    body.faultCodeId,
    body.createdByUserId,
    body.sourceInspectionTaskId,
    workOrderId,
  )

  if (!references.ok) {
    return failure(references.message)
  }

  await env.DB.prepare(
    `UPDATE work_orders
     SET source_inspection_task_id = ?1,
         equipment_id = ?2,
         fault_code_id = ?3,
         priority = ?4,
         created_at = ?5,
         created_by_user_id = ?6,
         creator_contact = ?7,
         spare_parts_updated_at = ?8,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?9`,
  )
    .bind(
      body.sourceInspectionTaskId,
      body.equipmentId,
      body.faultCodeId,
      body.priority,
      body.createdAt,
      body.createdByUserId,
      references.creator.contactLabel,
      existingWorkOrder.equipment_id !== body.equipmentId ? null : existingWorkOrder.spare_parts_updated_at ?? null,
      workOrderId,
    )
    .run()

  if (existingWorkOrder.equipment_id !== body.equipmentId) {
    await env.DB.prepare('DELETE FROM work_order_spare_parts WHERE work_order_id = ?1').bind(workOrderId).run()
  }

  return success({
    ...(await buildWorkOrderMutationPayload(env, workOrderId, guard.session.userId)),
    message: '维修工单已更新。',
  })
}

export async function onRequestDelete({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'work-orders', failure)

  if (guard.error) {
    return guard.error
  }

  const workOrderId = normalizeText(params.id)
  const existingWorkOrder = await loadWorkOrderRecord(env, workOrderId)

  if (!existingWorkOrder) {
    return failure('维修工单不存在。', 404)
  }

  if (existingWorkOrder.confirmed_at) {
    return failure('已确认的维修工单不可删除。')
  }

  const payload = await buildWorkOrderDetailPayload(env, workOrderId)

  if (!payload?.workOrder?.canDelete) {
    return failure('只有在所有维修任务完成或取消后，才可以删除维修工单。')
  }

  await env.DB.prepare('DELETE FROM work_orders WHERE id = ?1').bind(workOrderId).run()

  return success({
    ...(await buildWorkOrderBootstrapPayload(env, guard.session.userId)),
    message: '维修工单已删除。',
  })
}