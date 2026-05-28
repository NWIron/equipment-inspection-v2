import { requireFeatureAccess } from '../_lib/access'
import { buildEquipmentPayload, normalizeText } from '../_lib/equipment'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'

function normalizeIdList(value) {
  return Array.from(new Set(Array.isArray(value) ? value.map(normalizeText).filter(Boolean) : []))
}

export async function onRequestPost({ env, request }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'equipment', failure)

  if (guard.error) {
    return guard.error
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

  const existing = await env.DB.prepare('SELECT id FROM task_lists WHERE task_list_code = ?1 LIMIT 1')
    .bind(code)
    .first()

  if (existing) {
    return failure('任务清单 ID 已存在。')
  }

  const taskListId = crypto.randomUUID()

  await env.DB.batch([
    env.DB.prepare('INSERT INTO task_lists (id, task_list_code, description) VALUES (?1, ?2, ?3)').bind(
      taskListId,
      code,
      description,
    ),
    ...inspectionItemIds.map((inspectionItemId, index) =>
      env.DB.prepare(
        'INSERT INTO task_list_items (task_list_id, inspection_item_id, sort_order) VALUES (?1, ?2, ?3)',
      ).bind(taskListId, inspectionItemId, (index + 1) * 10),
    ),
  ])

  return success(
    {
      ...(await buildEquipmentPayload(env)),
      message: '任务清单已创建。',
    },
    { status: 201 },
  )
}