import { buildAccessPayloadForUser, requireFeatureAccess } from '../../_lib/access'
import { failure, success } from '../../_lib/http'
import { getSession } from '../../_lib/session'

export async function onRequestPost({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'access-management', failure)

  if (guard.error) {
    return guard.error
  }

  const userId = String(params.id ?? '')
  const targetUser = await env.DB.prepare('SELECT id, disabled FROM users WHERE id = ?1 LIMIT 1').bind(userId).first()

  if (!targetUser) {
    return failure('用户不存在。', 404)
  }

  if (userId === guard.payload.activeUser.id && !Boolean(targetUser.disabled)) {
    return failure('当前登录用户不能被禁用。')
  }

  const nextDisabledValue = Boolean(targetUser.disabled) ? 0 : 1
  await env.DB.prepare('UPDATE users SET disabled = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2')
    .bind(nextDisabledValue, userId)
    .run()

  return success({
    ...(await buildAccessPayloadForUser(env, guard.payload.activeUser.id)),
    message: nextDisabledValue ? '用户已禁用。' : '用户已重新启用。',
  })
}