import { requireFeatureAccess } from '../_lib/access'
import { buildWorkOrderBootstrapPayload } from '../_lib/workOrders'
import { failure, success } from '../_lib/http'
import { getSession } from '../_lib/session'
import { normalizeOptionalText } from '../_lib/equipment'

export async function onRequestGet({ env, request }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'work-orders', failure)

  if (guard.error) {
    return guard.error
  }

  const sourceTaskId = normalizeOptionalText(new URL(request.url).searchParams.get('sourceTaskId'))
  const payload = await buildWorkOrderBootstrapPayload(env, guard.session.userId, sourceTaskId)

  if (sourceTaskId && payload.sourceTaskMissing) {
    return failure('来源点检任务不存在。', 404)
  }

  return success(payload)
}