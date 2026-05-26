import { buildAccessPayload } from './_lib/access'
import { success } from './_lib/http'
import { getSession } from './_lib/session'

export async function onRequestGet({ env, request }) {
  return success(await buildAccessPayload(env, request, getSession))
}