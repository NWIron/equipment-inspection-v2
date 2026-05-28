import { requireFeatureAccess } from '../_lib/access'
import { buildEquipmentPayload, normalizeText } from '../_lib/equipment'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'

export async function onRequestPost({ env, request }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'equipment', failure)

  if (guard.error) {
    return guard.error
  }

  const body = await readJson(request)
  const code = normalizeText(body?.code)
  const description = normalizeText(body?.description)

  if (!code || !description) {
    return failure('请完整填写点检项主数据。')
  }

  const existing = await env.DB.prepare('SELECT id FROM inspection_items WHERE item_code = ?1 LIMIT 1')
    .bind(code)
    .first()

  if (existing) {
    return failure('点检项 ID 已存在。')
  }

  await env.DB.prepare('INSERT INTO inspection_items (id, item_code, description) VALUES (?1, ?2, ?3)')
    .bind(crypto.randomUUID(), code, description)
    .run()

  return success(
    {
      ...(await buildEquipmentPayload(env)),
      message: '点检项已创建。',
    },
    { status: 201 },
  )
}