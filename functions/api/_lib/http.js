export function success(payload = {}, init = {}) {
  return Response.json({ ok: true, ...payload }, init)
}

export function failure(message, status = 400, extras = {}) {
  return Response.json({ ok: false, message, ...extras }, { status })
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}