import { requireFeatureAccess } from '../../_lib/access'
import {
  buildInspectionTaskDetailPayload,
  normalizeTaskResultStatus,
  TASK_RESULT_STATUS_OPTIONS,
} from '../../_lib/inspectionTasks'
import { failure, readJson, success } from '../../_lib/http'
import { getSession } from '../../_lib/session'
import { normalizeOptionalText, normalizeText } from '../../_lib/equipment'

async function loadTaskForResults(env, taskId) {
  return env.DB.prepare('SELECT id, status FROM inspection_tasks WHERE id = ?1 LIMIT 1').bind(taskId).first()
}

const MAX_PHOTO_COUNT = 6
const MAX_PHOTO_DATA_LENGTH = 1_800_000

function normalizeInspectionPhotos(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item, index) => ({
    fileName: normalizeOptionalText(item?.fileName) ?? `inspection-photo-${index + 1}.jpg`,
    photoData: normalizeOptionalText(item?.photoData) ?? '',
    sortOrder: Number(item?.sortOrder ?? index + 1),
  }))
}

export async function onRequestPut({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'inspection-tasks', failure)

  if (guard.error) {
    return guard.error
  }

  const taskId = normalizeText(params.id)
  const task = await loadTaskForResults(env, taskId)

  if (!task) {
    return failure('点检任务不存在。', 404)
  }

  if (task.status === '已完成') {
    return failure('已完成任务不可再修改点检结果。')
  }

  const body = await readJson(request)
  const faultCodeId = normalizeOptionalText(body?.faultCodeId)
  const faultNote = normalizeOptionalText(body?.faultNote) ?? ''
  const results = Array.isArray(body?.results) ? body.results : []
  const photos = normalizeInspectionPhotos(body?.photos)

  const existingRows = (
    await env.DB.prepare(
      'SELECT inspection_item_id FROM inspection_task_results WHERE task_id = ?1 ORDER BY sort_order ASC',
    )
      .bind(taskId)
      .all()
  ).results ?? []

  const validItemIds = new Set(existingRows.map((row) => row.inspection_item_id))

  if (!existingRows.length) {
    return failure('当前任务未找到关联点检项。')
  }

  if (faultCodeId) {
    const faultCode = await env.DB.prepare('SELECT id FROM fault_codes WHERE id = ?1 LIMIT 1').bind(faultCodeId).first()

    if (!faultCode) {
      return failure('故障代码不存在。')
    }
  }

  if (photos.length > MAX_PHOTO_COUNT) {
    return failure(`现场照片最多上传 ${MAX_PHOTO_COUNT} 张。`)
  }

  if (
    photos.some(
      (item) =>
        !item.photoData ||
        !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(item.photoData) ||
        item.photoData.length > MAX_PHOTO_DATA_LENGTH,
    )
  ) {
    return failure('上传照片无效或体积过大，请重新拍摄后再保存。')
  }

  const normalizedResults = results.map((item) => ({
    inspectionItemId: normalizeText(item?.inspectionItemId),
    resultStatus: normalizeTaskResultStatus(item?.resultStatus),
    remark: normalizeOptionalText(item?.remark) ?? '',
  }))

  if (normalizedResults.some((item) => !item.inspectionItemId || !validItemIds.has(item.inspectionItemId))) {
    return failure('存在无效的点检项结果。')
  }

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE inspection_tasks
       SET fault_code_id = ?1,
           fault_note = ?2,
           status = CASE WHEN status = '待执行' THEN '执行中' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3`,
    ).bind(faultCodeId, faultNote, taskId),
    env.DB.prepare('DELETE FROM inspection_task_photos WHERE task_id = ?1').bind(taskId),
    ...normalizedResults.map((item) =>
      env.DB.prepare(
        `UPDATE inspection_task_results
         SET result_status = ?1,
             remark = ?2,
             updated_at = CURRENT_TIMESTAMP
         WHERE task_id = ?3 AND inspection_item_id = ?4`,
      ).bind(item.resultStatus, item.remark, taskId, item.inspectionItemId),
    ),
    ...photos.map((item, index) =>
      env.DB.prepare(
        `INSERT INTO inspection_task_photos (id, task_id, file_name, photo_data, sort_order, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)`,
      ).bind(crypto.randomUUID(), taskId, item.fileName, item.photoData, index + 1),
    ),
  ])

  return success({
    ...(await buildInspectionTaskDetailPayload(env, taskId, guard.session.userId)),
    message: '点检结果已保存。',
    resultStatusOptions: TASK_RESULT_STATUS_OPTIONS,
  })
}