import { requireFeatureAccess } from '../_lib/access'
import { buildInspectionTaskBootstrapPayload } from '../_lib/inspectionTasks'
import { failure, success } from '../_lib/http'
import { getSession } from '../_lib/session'

export async function onRequestGet({ env, request }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'inspection-tasks', failure)

  if (guard.error) {
    return guard.error
  }

  return success(await buildInspectionTaskBootstrapPayload(env, guard.session.userId))
}