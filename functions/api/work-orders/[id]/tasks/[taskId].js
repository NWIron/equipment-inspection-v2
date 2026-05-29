import { requireFeatureAccess } from '../../../_lib/access'
import { buildWorkOrderMutationPayload, normalizeWorkOrderTaskBody } from '../../../_lib/workOrders'
import { failure, readJson, success } from '../../../_lib/http'
import { getSession } from '../../../_lib/session'
import { normalizeText } from '../../../_lib/equipment'

async function loadTaskRecord(env, workOrderId, taskId) {
  return env.DB.prepare(
    `SELECT work_order_tasks.id,
            work_order_tasks.work_order_id,
            work_orders.confirmed_at
     FROM work_order_tasks
     INNER JOIN work_orders ON work_orders.id = work_order_tasks.work_order_id
     WHERE work_order_tasks.work_order_id = ?1 AND work_order_tasks.id = ?2
     LIMIT 1`,
  )
    .bind(workOrderId, taskId)
    .first()
}

async function engineerExists(env, engineerUserId) {
  const row = await env.DB.prepare(
    `SELECT DISTINCT users.id
     FROM users
     INNER JOIN user_roles ON user_roles.user_id = users.id
     INNER JOIN role_features ON role_features.role_id = user_roles.role_id
     WHERE users.disabled = 0 AND role_features.feature_id = 'work-orders' AND users.id = ?1
     LIMIT 1`,
  )
    .bind(engineerUserId)
    .first()

  return Boolean(row)
}

export async function onRequestPut({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'work-orders', failure)

  if (guard.error) {
    return guard.error
  }

  const workOrderId = normalizeText(params.id)
  const taskId = normalizeText(params.taskId)
  const existingTask = await loadTaskRecord(env, workOrderId, taskId)

  if (!existingTask) {
    return failure('维修任务不存在。', 404)
  }

  if (existingTask.confirmed_at) {
    return failure('已确认的维修工单不可再修改任务。')
  }

  const body = normalizeWorkOrderTaskBody(await readJson(request))

  if (!body.taskName || !body.engineerUserId) {
    return failure('请完整填写维修任务信息。')
  }

  if (!(await engineerExists(env, body.engineerUserId))) {
    return failure('维修工程师不存在或未授权维修工单模块。')
  }

  await env.DB.prepare(
    `UPDATE work_order_tasks
     SET task_name = ?1,
         engineer_user_id = ?2,
         status = ?3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?4 AND work_order_id = ?5`,
  )
    .bind(body.taskName, body.engineerUserId, body.status, taskId, workOrderId)
    .run()

  return success({
    ...(await buildWorkOrderMutationPayload(env, workOrderId, guard.session.userId)),
    message: '维修任务已更新。',
  })
}

export async function onRequestDelete({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'work-orders', failure)

  if (guard.error) {
    return guard.error
  }

  const workOrderId = normalizeText(params.id)
  const taskId = normalizeText(params.taskId)
  const existingTask = await loadTaskRecord(env, workOrderId, taskId)

  if (!existingTask) {
    return failure('维修任务不存在。', 404)
  }

  if (existingTask.confirmed_at) {
    return failure('已确认的维修工单不可再删除任务。')
  }

  await env.DB.prepare('DELETE FROM work_order_tasks WHERE id = ?1 AND work_order_id = ?2').bind(taskId, workOrderId).run()

  return success({
    ...(await buildWorkOrderMutationPayload(env, workOrderId, guard.session.userId)),
    message: '维修任务已删除。',
  })
}