import { requireFeatureAccess } from '../_lib/access'
import { buildAuditLogPayload } from '../_lib/audit'
import { failure, success } from '../_lib/http'
import { getSession } from '../_lib/session'

function normalizeText(value) {
  return String(value ?? '').trim()
}

export async function onRequestGet({ env, request }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'audit-logs', failure)

  if (guard.error) {
    return guard.error
  }

  try {
    const url = new URL(request.url)
    const payload = await buildAuditLogPayload(env, {
      action: normalizeText(url.searchParams.get('action')),
      featureId: normalizeText(url.searchParams.get('featureId')),
      operatorUserId: normalizeText(url.searchParams.get('operatorUserId')),
      keyword: normalizeText(url.searchParams.get('keyword')),
      startDate: normalizeText(url.searchParams.get('startDate')),
      endDate: normalizeText(url.searchParams.get('endDate')),
      limit: normalizeText(url.searchParams.get('limit')),
    })

    return success(payload)
  } catch {
    return failure('无法加载日志审计报表，请确认 Cloudflare Pages Functions 与 D1 已完成初始化。', 500)
  }
}