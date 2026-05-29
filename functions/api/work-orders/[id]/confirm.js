import { requireFeatureAccess } from '../../_lib/access'
import { buildWorkOrderDetailPayload, buildWorkOrderMutationPayload } from '../../_lib/workOrders'
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

  if (!confirmedAt) {
    return failure('请填写维修工单确认时间。')
  }

  await env.DB.prepare(
    `UPDATE work_orders
     SET confirmed_at = ?1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?2`,
  )
    .bind(confirmedAt, workOrderId)
    .run()

  return success({
    ...(await buildWorkOrderMutationPayload(env, workOrderId, guard.session.userId)),
    message: '维修工单已确认。',
  })
}