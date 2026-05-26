import { buildAccessPayloadForUser, requireFeatureAccess } from '../_lib/access'
import { failure, success } from '../_lib/http'
import { getSession } from '../_lib/session'

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