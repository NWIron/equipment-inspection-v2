import { buildBlankAccessPayload } from '../_lib/access'
import { success } from '../_lib/http'
import { clearSessionCookie, destroySession, getSession } from '../_lib/session'

export async function onRequestPost({ env, request }) {
  const session = await getSession(request, env)

  if (session) {
    await destroySession(env, session.id)
  }

  return success(buildBlankAccessPayload(), {
    headers: {
      'Set-Cookie': clearSessionCookie(request),
    },
  })
}