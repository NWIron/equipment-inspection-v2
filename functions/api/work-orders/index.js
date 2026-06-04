import { requireFeatureAccess } from '../_lib/access'
import {
  buildWorkOrderBootstrapPayload,
  generateWorkOrderNumber,
  normalizeWorkOrderBody,
  validateWorkOrderReferences,
} from '../_lib/workOrders'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'

export async function onRequestPost({ env, request }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'work-orders', failure)

  if (guard.error) {
    return guard.error
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
    null,
  )

  if (!references.ok) {
    return failure(references.message)
  }

  const workOrderId = crypto.randomUUID()
  const orderNumber = await generateWorkOrderNumber(env, body.createdAt)

  await env.DB.prepare(
    `INSERT INTO work_orders (
       id,
       order_number,
       source_inspection_task_id,
       equipment_id,
       fault_code_id,
       priority,
       created_at,
       created_by_user_id,
       creator_contact
     )
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(
      workOrderId,
      orderNumber,
      body.sourceInspectionTaskId,
      body.equipmentId,
      body.faultCodeId,
      body.priority,
      body.createdAt,
      body.createdByUserId,
      references.creator.contactLabel,
    )
    .run()

  return success(
    {
      ...(await buildWorkOrderBootstrapPayload(env, guard.session.userId)),
      message: '维修工单已创建。',
    },
    { status: 201 },
  )
}