import { buildAccessPayloadForUser, requireFeatureAccess } from '../_lib/access'
import { failure, success } from '../_lib/http'
import { getSession } from '../_lib/session'

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