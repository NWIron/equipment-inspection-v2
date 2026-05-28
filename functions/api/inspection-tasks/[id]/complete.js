import { requireFeatureAccess } from '../../_lib/access'
import { buildInspectionTaskDetailPayload } from '../../_lib/inspectionTasks'
import { failure, success } from '../../_lib/http'
import { getSession } from '../../_lib/session'
import { normalizeText } from '../../_lib/equipment'

async function loadTaskForCompletion(env, taskId) {
  return env.DB.prepare(
    `SELECT inspection_tasks.id,
            inspection_tasks.inspector_user_id,
            inspection_tasks.status,
            equipment_assets.owner_user_id
     FROM inspection_tasks
     INNER JOIN equipment_assets ON equipment_assets.id = inspection_tasks.equipment_id
     WHERE inspection_tasks.id = ?1
     LIMIT 1`,
  )
    .bind(taskId)
    .first()
}

export async function onRequestPost({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'inspection-tasks', failure)

  if (guard.error) {
    return guard.error
  }

  const taskId = normalizeText(params.id)
  const task = await loadTaskForCompletion(env, taskId)

  if (!task) {
    return failure('点检任务不存在。', 404)
  }

  if (![task.inspector_user_id, task.owner_user_id].includes(guard.session.userId)) {
    return failure('只有负责点检的点检员或设备责任人可以完成任务。', 403)
  }

  if (task.status === '已完成') {
    return failure('当前任务已完成。')
  }

  const pendingResult = await env.DB.prepare(
    `SELECT inspection_item_id
     FROM inspection_task_results
     WHERE task_id = ?1 AND result_status = '待检'
     LIMIT 1`,
  )
    .bind(taskId)
    .first()

  if (pendingResult) {
    return failure('请先完成所有点检项后再将任务标记为已完成。')
  }

  await env.DB.prepare(
    `UPDATE inspection_tasks
     SET status = '已完成', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?1`,
  )
    .bind(taskId)
    .run()

  return success({
    ...(await buildInspectionTaskDetailPayload(env, taskId, guard.session.userId)),
    message: '点检任务已完成。',
  })
}