import { requireFeatureAccess } from '../_lib/access'
import {
  buildInspectionTaskBootstrapPayload,
  generateInspectionTaskNumber,
  getEquipmentInspectionItems,
  normalizeInspectionTaskBody,
  validateInspectionTaskReferences,
} from '../_lib/inspectionTasks'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'

export async function onRequestPost({ env, request }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'inspection-tasks', failure)

  if (guard.error) {
    return guard.error
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

  const taskId = crypto.randomUUID()
  const taskNumber = await generateInspectionTaskNumber(env, body.createdAt)
  const inspectionItems = await getEquipmentInspectionItems(env, body.equipmentId)

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO inspection_tasks (
        id, task_number, task_name, created_at, equipment_id, inspector_user_id, fault_code_id, fault_note, priority, status
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    ).bind(
      taskId,
      taskNumber,
      body.taskName,
      body.createdAt,
      body.equipmentId,
      body.inspectorUserId,
      body.faultCodeId,
      body.faultNote,
      body.priority,
      body.status,
    ),
    ...inspectionItems.map((item, index) =>
      env.DB.prepare(
        `INSERT INTO inspection_task_results (
           task_id, inspection_item_id, sort_order, result_status, remark
         )
         VALUES (?1, ?2, ?3, '待检', '')`,
      ).bind(taskId, item.id, (index + 1) * 10),
    ),
  ])

  return success(
    {
      ...(await buildInspectionTaskBootstrapPayload(env, guard.session.userId)),
      message: '点检任务已创建。',
    },
    { status: 201 },
  )
}