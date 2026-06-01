import { buildAccessPayloadForUser, requireFeatureAccess } from '../_lib/access'
import { failure, readJson, success } from '../_lib/http'
import { getSession } from '../_lib/session'

function normalizeText(value) {
  return String(value ?? '').trim()
}

export async function onRequestPut({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'access-management', failure)

  if (guard.error) {
    return guard.error
  }

  const roleId = String(params.id ?? '')
  const targetRole = await env.DB.prepare('SELECT id FROM roles WHERE id = ?1 LIMIT 1').bind(roleId).first()

  if (!targetRole) {
    return failure('角色不存在。', 404)
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

  const existingRole = await env.DB.prepare('SELECT id FROM roles WHERE lower(name) = lower(?1) AND id != ?2 LIMIT 1')
    .bind(name, roleId)
    .first()

  if (existingRole) {
    return failure('角色名称已存在。')
  }

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE roles
       SET name = ?1,
           description = ?2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3`,
    ).bind(name, description, roleId),
    env.DB.prepare('DELETE FROM role_features WHERE role_id = ?1').bind(roleId),
    ...featureIds.map((featureId) =>
      env.DB.prepare('INSERT INTO role_features (role_id, feature_id) VALUES (?1, ?2)').bind(roleId, featureId),
    ),
  ])

  return success({
    ...(await buildAccessPayloadForUser(env, guard.payload.activeUser.id)),
    message: '角色已更新。',
  })
}

export async function onRequestDelete({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'access-management', failure)

  if (guard.error) {
    return guard.error
  }

  const roleId = String(params.id ?? '')
  const targetRole = await env.DB.prepare('SELECT id, is_system FROM roles WHERE id = ?1 LIMIT 1').bind(roleId).first()

  if (!targetRole) {
    return failure('角色不存在。', 404)
  }

  if (Boolean(targetRole.is_system)) {
    return failure('系统种子角色不可删除。')
  }

  await env.DB.prepare('DELETE FROM roles WHERE id = ?1').bind(roleId).run()

  return success({
    ...(await buildAccessPayloadForUser(env, guard.payload.activeUser.id)),
    message: '角色已删除。',
  })
}