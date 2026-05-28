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
    return failure('请完整填写故障代码主数据。')
  }

  const existing = await env.DB.prepare('SELECT id FROM fault_codes WHERE fault_code = ?1 LIMIT 1')
    .bind(code)
    .first()

  if (existing) {
    return failure('故障 ID 已存在。')
  }

  await env.DB.prepare('INSERT INTO fault_codes (id, fault_code, description) VALUES (?1, ?2, ?3)')
    .bind(crypto.randomUUID(), code, description)
    .run()

  return success(
    {
      ...(await buildEquipmentPayload(env)),
      message: '故障代码已创建。',
    },
    { status: 201 },
  )
}