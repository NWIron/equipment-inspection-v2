import { buildAccessPayloadForUser } from '../_lib/access'
import { failure, readJson, success } from '../_lib/http'
import { verifyPassword } from '../_lib/password'
import { buildSessionCookie, createSession } from '../_lib/session'

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')

  if (!email || !password) {
    return failure('请输入邮箱和密码。')
  }

  const user = await env.DB.prepare(
    `SELECT id, disabled, password_hash, password_salt
     FROM users
     WHERE lower(email) = ?1
     LIMIT 1`,
  )
    .bind(email)
    .first()

  if (!user) {
    return failure('账号不存在，请检查邮箱地址。', 401)
  }

  if (Boolean(user.disabled)) {
    return failure('当前账号已被禁用，请联系管理员。', 403)
  }

  const passwordMatched = await verifyPassword(password, user.password_salt, user.password_hash)

  if (!passwordMatched) {
    return failure('密码错误，请重新输入。', 401)
  }

  const loginAt = new Date().toISOString()
  await env.DB.prepare('UPDATE users SET last_login_at = ?1, updated_at = ?1 WHERE id = ?2')
    .bind(loginAt, user.id)
    .run()

  const session = await createSession(env, user.id)
  const payload = await buildAccessPayloadForUser(env, user.id)

  return success(payload, {
    headers: {
      'Set-Cookie': buildSessionCookie(request, session.id),
    },
  })
}