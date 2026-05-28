import { requireFeatureAccess } from '../_lib/access'
import { buildEquipmentPayload, normalizeText } from '../_lib/equipment'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'

export async function onRequestPut({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'equipment', failure)

  if (guard.error) {
    return guard.error
  }

  const itemId = normalizeText(params.id)
  const target = await env.DB.prepare('SELECT id FROM inspection_items WHERE id = ?1 LIMIT 1')
    .bind(itemId)
    .first()

  if (!target) {
    return failure('点检项不存在。', 404)
  }

  const body = await readJson(request)
  const code = normalizeText(body?.code)
  const description = normalizeText(body?.description)

  if (!code || !description) {
    return failure('请完整填写点检项主数据。')
  }

  const existing = await env.DB.prepare(
    'SELECT id FROM inspection_items WHERE item_code = ?1 AND id <> ?2 LIMIT 1',
  )
    .bind(code, itemId)
    .first()

  if (existing) {
    return failure('点检项 ID 已存在。')
  }

  await env.DB.prepare(
    `UPDATE inspection_items
     SET item_code = ?1, description = ?2, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?3`,
  )
    .bind(code, description, itemId)
    .run()

  return success({
    ...(await buildEquipmentPayload(env)),
    message: '点检项已更新。',
  })
}

export async function onRequestDelete({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'equipment', failure)

  if (guard.error) {
    return guard.error
  }

  const itemId = normalizeText(params.id)
  const target = await env.DB.prepare('SELECT id FROM inspection_items WHERE id = ?1 LIMIT 1')
    .bind(itemId)
    .first()

  if (!target) {
    return failure('点检项不存在。', 404)
  }

  await env.DB.prepare('DELETE FROM inspection_items WHERE id = ?1').bind(itemId).run()

  return success({
    ...(await buildEquipmentPayload(env)),
    message: '点检项已删除。',
  })
}