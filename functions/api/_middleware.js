import { buildAuditLogPayload, readAuditPayload, resolveAuditMetadata, writeAuditLog } from './_lib/audit'
import { getSession } from './_lib/session'

export async function onRequest(context) {
  const auditMetadata = resolveAuditMetadata(context.request)
  const auditPayload = auditMetadata ? await readAuditPayload(context.request) : null
  const response = await context.next()

  if (!auditMetadata || !response.ok) {
    return response
  }

  try {
    const session = await getSession(context.request, context.env)

    await writeAuditLog(context.env, {
      ...auditMetadata,
      operatorUserId: session?.userId ?? null,
      resourceLabel: auditPayload?.resourceLabel ?? '',
      payloadJson: auditPayload?.payloadJson ?? '',
    })
  } catch (error) {
    console.error('Failed to write audit log.', error)
  }

  return response
}

export { buildAuditLogPayload }