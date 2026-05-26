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

  const userId = String(params.id ?? '')
  const targetUser = await env.DB.prepare('SELECT id FROM users WHERE id = ?1 LIMIT 1').bind(userId).first()

  if (!targetUser) {
    return failure('用户不存在。', 404)
  }

  const body = await readJson(request)
  const accountName = normalizeText(body?.accountName)
  const name = normalizeText(body?.name)
  const email = normalizeText(body?.email).toLowerCase()
  const phone = normalizeText(body?.phone)
  const roleIds = Array.from(
    new Set(Array.isArray(body?.roleIds) ? body.roleIds.map(normalizeText).filter(Boolean) : []),
  )

  if (!accountName || !name || !email || !phone) {
    return failure('请完整填写用户主数据。')
  }

  if (!roleIds.length) {
    return failure('请至少分配一个角色。')
  }

  const existingByEmail = await env.DB.prepare(
    'SELECT id FROM users WHERE lower(email) = ?1 AND id <> ?2 LIMIT 1',
  )
    .bind(email, userId)
    .first()

  if (existingByEmail) {
    return failure('邮箱已存在，请使用其他邮箱。')
  }

  const existingByAccount = await env.DB.prepare(
    'SELECT id FROM users WHERE account_name = ?1 AND id <> ?2 LIMIT 1',
  )
    .bind(accountName, userId)
    .first()

  if (existingByAccount) {
    return failure('账号名已存在，请更换后重试。')
  }

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE users
       SET account_name = ?1, name = ?2, email = ?3, phone = ?4, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?5`,
    ).bind(accountName, name, email, phone, userId),
    env.DB.prepare('DELETE FROM user_roles WHERE user_id = ?1').bind(userId),
    ...roleIds.map((roleId) =>
      env.DB.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?1, ?2)').bind(userId, roleId),
    ),
  ])

  return success({
    ...(await buildAccessPayloadForUser(env, guard.payload.activeUser.id)),
    message: '用户已更新。',
  })
}

export async function onRequestDelete({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'access-management', failure)

  if (guard.error) {
    return guard.error
  }

  const userId = String(params.id ?? '')
  const targetUser = await env.DB.prepare('SELECT id FROM users WHERE id = ?1 LIMIT 1').bind(userId).first()

  if (!targetUser) {
    return failure('用户不存在。', 404)
  }

  if (userId === guard.payload.activeUser.id) {
    return failure('当前登录用户不能删除自身。')
  }

  await env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(userId).run()

  return success({
    ...(await buildAccessPayloadForUser(env, guard.payload.activeUser.id)),
    message: '用户已删除。',
  })
}