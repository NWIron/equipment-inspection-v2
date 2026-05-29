import { requireFeatureAccess } from '../../_lib/access'
import {
  buildWorkOrderMutationPayload,
  normalizeWorkOrderTaskBody,
  validateWorkOrderTaskReferences,
} from '../../_lib/workOrders'
import { failure, readJson, success } from '../../_lib/http'
import { getSession } from '../../_lib/session'
import { normalizeText } from '../../_lib/equipment'

export async function onRequestPost({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'work-orders', failure)

  if (guard.error) {
    return guard.error
  }

  const workOrderId = normalizeText(params.id)
  const body = normalizeWorkOrderTaskBody(await readJson(request))

  if (!body.taskName || !body.engineerUserId) {
    return failure('请完整填写维修任务信息。')
  }

  const references = await validateWorkOrderTaskReferences(env, workOrderId, body.engineerUserId)

  if (!references.ok) {
    return failure(references.message, references.status ?? 400)
  }

  await env.DB.prepare(
    `INSERT INTO work_order_tasks (id, work_order_id, task_name, engineer_user_id, status)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  )
    .bind(crypto.randomUUID(), workOrderId, body.taskName, body.engineerUserId, body.status)
    .run()

  return success({
    ...(await buildWorkOrderMutationPayload(env, workOrderId, guard.session.userId)),
    message: '维修任务已创建。',
  })
}