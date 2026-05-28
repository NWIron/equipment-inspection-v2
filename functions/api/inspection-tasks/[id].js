import { requireFeatureAccess } from '../_lib/access'
import {
  buildInspectionTaskBootstrapPayload,
  buildInspectionTaskDetailPayload,
  getEquipmentInspectionItems,
  loadExistingTaskResultMap,
  normalizeInspectionTaskBody,
  validateInspectionTaskReferences,
} from '../_lib/inspectionTasks'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'
import { normalizeText } from '../_lib/equipment'

async function loadTaskRecord(env, taskId) {
  return env.DB.prepare(
    `SELECT inspection_tasks.id,
            inspection_tasks.equipment_id,
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

export async function onRequestGet({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'inspection-tasks', failure)

  if (guard.error) {
    return guard.error
  }

  const taskId = normalizeText(params.id)
  const payload = await buildInspectionTaskDetailPayload(env, taskId, guard.session.userId)

  if (!payload) {
    return failure('点检任务不存在。', 404)
  }

  return success(payload)
}

export async function onRequestPut({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'inspection-tasks', failure)

  if (guard.error) {
    return guard.error
  }

  const taskId = normalizeText(params.id)
  const existingTask = await loadTaskRecord(env, taskId)

  if (!existingTask) {
    return failure('点检任务不存在。', 404)
  }

  if (existingTask.status === '已完成') {
    return failure('已完成任务不可修改主数据。')
  }

  const body = normalizeInspectionTaskBody(await readJson(request))

  if (!body.taskName || !body.equipmentId || !body.inspectorUserId) {
    return failure('请完整填写点检任务主数据。')
  }

  const references = await validateInspectionTaskReferences(
    env,
    body.equipmentId,
    body.inspectorUserId,
    body.faultCodeId,
  )

  if (!references.ok) {
    return failure(references.message)
  }

  const inspectionItems = await getEquipmentInspectionItems(env, body.equipmentId)
  const existingResults = await loadExistingTaskResultMap(env, taskId)

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE inspection_tasks
       SET task_name = ?1,
           created_at = ?2,
           equipment_id = ?3,
           inspector_user_id = ?4,
           fault_code_id = ?5,
           fault_note = ?6,
           priority = ?7,
           status = ?8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?9`,
    ).bind(
      body.taskName,
      body.createdAt,
      body.equipmentId,
      body.inspectorUserId,
      body.faultCodeId,
      body.faultNote,
      body.priority,
      body.status,
      taskId,
    ),
    env.DB.prepare('DELETE FROM inspection_task_results WHERE task_id = ?1').bind(taskId),
    ...inspectionItems.map((item, index) =>
      env.DB.prepare(
        `INSERT INTO inspection_task_results (
           task_id, inspection_item_id, sort_order, result_status, remark
         )
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      ).bind(
        taskId,
        item.id,
        (index + 1) * 10,
        existingResults[item.id]?.resultStatus ?? '待检',
        existingResults[item.id]?.remark ?? '',
      ),
    ),
  ])

  return success({
    ...(await buildInspectionTaskBootstrapPayload(env, guard.session.userId)),
    message: '点检任务已更新。',
  })
}

export async function onRequestDelete({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'inspection-tasks', failure)

  if (guard.error) {
    return guard.error
  }

  const taskId = normalizeText(params.id)
  const existingTask = await loadTaskRecord(env, taskId)

  if (!existingTask) {
    return failure('点检任务不存在。', 404)
  }

  await env.DB.prepare('DELETE FROM inspection_tasks WHERE id = ?1').bind(taskId).run()

  return success({
    ...(await buildInspectionTaskBootstrapPayload(env, guard.session.userId)),
    message: '点检任务已删除。',
  })
}