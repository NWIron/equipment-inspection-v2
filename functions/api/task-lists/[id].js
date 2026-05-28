import { requireFeatureAccess } from '../_lib/access'
import { buildEquipmentPayload, normalizeText } from '../_lib/equipment'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'

function normalizeIdList(value) {
  return Array.from(new Set(Array.isArray(value) ? value.map(normalizeText).filter(Boolean) : []))
}

export async function onRequestPut({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'equipment', failure)

  if (guard.error) {
    return guard.error
  }

  const taskListId = normalizeText(params.id)
  const target = await env.DB.prepare('SELECT id FROM task_lists WHERE id = ?1 LIMIT 1').bind(taskListId).first()

  if (!target) {
    return failure('任务清单不存在。', 404)
  }

  const body = await readJson(request)
  const code = normalizeText(body?.code)
  const description = normalizeText(body?.description)
  const inspectionItemIds = normalizeIdList(body?.inspectionItemIds)

  if (!code || !description) {
    return failure('请完整填写任务清单主数据。')
  }

  if (!inspectionItemIds.length) {
    return failure('请至少为任务清单选择一个点检项。')
  }

  const existing = await env.DB.prepare(
    'SELECT id FROM task_lists WHERE task_list_code = ?1 AND id <> ?2 LIMIT 1',
  )
    .bind(code, taskListId)
    .first()

  if (existing) {
    return failure('任务清单 ID 已存在。')
  }

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE task_lists
       SET task_list_code = ?1, description = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3`,
    ).bind(code, description, taskListId),
    env.DB.prepare('DELETE FROM task_list_items WHERE task_list_id = ?1').bind(taskListId),
    ...inspectionItemIds.map((inspectionItemId, index) =>
      env.DB.prepare(
        'INSERT INTO task_list_items (task_list_id, inspection_item_id, sort_order) VALUES (?1, ?2, ?3)',
      ).bind(taskListId, inspectionItemId, (index + 1) * 10),
    ),
  ])

  return success({
    ...(await buildEquipmentPayload(env)),
    message: '任务清单已更新。',
  })
}

export async function onRequestDelete({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'equipment', failure)

  if (guard.error) {
    return guard.error
  }

  const taskListId = normalizeText(params.id)
  const target = await env.DB.prepare('SELECT id FROM task_lists WHERE id = ?1 LIMIT 1').bind(taskListId).first()

  if (!target) {
    return failure('任务清单不存在。', 404)
  }

  await env.DB.prepare('DELETE FROM task_lists WHERE id = ?1').bind(taskListId).run()

  return success({
    ...(await buildEquipmentPayload(env)),
    message: '任务清单已删除。',
  })
}