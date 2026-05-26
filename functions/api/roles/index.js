import { buildAccessPayloadForUser, requireFeatureAccess } from '../_lib/access'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'

function normalizeText(value) {
  return String(value ?? '').trim()
}

export async function onRequestPost({ env, request }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'access-management', failure)

  if (guard.error) {
    return guard.error
  }

  const body = await readJson(request)
  const name = normalizeText(body?.name)
  const description = normalizeText(body?.description)
  const featureIds = Array.from(
    new Set(Array.isArray(body?.featureIds) ? body.featureIds.map(normalizeText).filter(Boolean) : []),
  )

  if (!name) {
    return failure('请输入角色名称。')
  }

  if (!featureIds.length) {
    return failure('请至少为角色分配一个功能卡片。')
  }

  const existingRole = await env.DB.prepare('SELECT id FROM roles WHERE lower(name) = lower(?1) LIMIT 1')
    .bind(name)
    .first()

  if (existingRole) {
    return failure('角色名称已存在。')
  }

  const roleId = crypto.randomUUID()

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO roles (id, name, description, is_system) VALUES (?1, ?2, ?3, 0)',
    ).bind(roleId, name, description),
    ...featureIds.map((featureId) =>
      env.DB.prepare('INSERT INTO role_features (role_id, feature_id) VALUES (?1, ?2)').bind(roleId, featureId),
    ),
  ])

  return success(
    {
      ...(await buildAccessPayloadForUser(env, guard.payload.activeUser.id)),
      message: '角色已创建。',
    },
    { status: 201 },
  )
}