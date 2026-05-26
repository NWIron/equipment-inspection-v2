import { buildAccessPayloadForUser, requireFeatureAccess } from '../_lib/access'
import { failure, readJson, success } from '../_lib/http'
import { hashPassword } from '../_lib/password'
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
  const accountName = normalizeText(body?.accountName)
  const name = normalizeText(body?.name)
  const email = normalizeText(body?.email).toLowerCase()
  const phone = normalizeText(body?.phone)
  const password = String(body?.password ?? '')
  const roleIds = Array.from(new Set(Array.isArray(body?.roleIds) ? body.roleIds.map(normalizeText).filter(Boolean) : []))

  if (!accountName || !name || !email || !phone || !password) {
    return failure('请完整填写用户主数据。')
  }

  if (password.length < 6) {
    return failure('密码长度至少为 6 位。')
  }

  if (!roleIds.length) {
    return failure('请至少分配一个角色。')
  }

  const existingByEmail = await env.DB.prepare('SELECT id FROM users WHERE lower(email) = ?1 LIMIT 1')
    .bind(email)
    .first()

  if (existingByEmail) {
    return failure('邮箱已存在，请使用其他邮箱。')
  }

  const existingByAccount = await env.DB.prepare('SELECT id FROM users WHERE account_name = ?1 LIMIT 1')
    .bind(accountName)
    .first()

  if (existingByAccount) {
    return failure('账号名已存在，请更换后重试。')
  }

  const userId = crypto.randomUUID()
  const salt = crypto.randomUUID()
  const passwordHash = await hashPassword(password, salt)

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO users (id, account_name, name, email, phone, password_hash, password_salt, disabled)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0)`,
    ).bind(userId, accountName, name, email, phone, passwordHash, salt),
    ...roleIds.map((roleId) =>
      env.DB.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?1, ?2)').bind(userId, roleId),
    ),
  ])

  return success(
    {
      ...(await buildAccessPayloadForUser(env, guard.payload.activeUser.id)),
      message: '用户已创建。',
    },
    { status: 201 },
  )
}