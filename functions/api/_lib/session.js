const SESSION_COOKIE_NAME = 'equipment_inspection_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

function parseCookies(request) {
  const cookieHeader = request.headers.get('Cookie') ?? ''

  return cookieHeader.split(';').reduce((cookies, entry) => {
    const [rawName, ...rawValue] = entry.trim().split('=')

    if (!rawName) {
      return cookies
    }

    cookies[rawName] = decodeURIComponent(rawValue.join('='))
    return cookies
  }, {})
}

export function buildSessionCookie(request, sessionId) {
  const isSecure = new URL(request.url).protocol === 'https:'

  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE}`,
    isSecure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export function clearSessionCookie(request) {
  const isSecure = new URL(request.url).protocol === 'https:'

  return [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    isSecure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export async function createSession(env, userId) {
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString()

  await env.DB.prepare(
    'INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)',
  )
    .bind(sessionId, userId, expiresAt)
    .run()

  return {
    id: sessionId,
    userId,
    expiresAt,
  }
}

export async function destroySession(env, sessionId) {
  if (!sessionId) {
    return
  }

  await env.DB.prepare('DELETE FROM auth_sessions WHERE id = ?1').bind(sessionId).run()
}

export async function getSession(request, env) {
  const cookies = parseCookies(request)
  const sessionId = cookies[SESSION_COOKIE_NAME]

  if (!sessionId) {
    return null
  }

  const session = await env.DB.prepare(
    `SELECT auth_sessions.id, auth_sessions.user_id, auth_sessions.expires_at
     FROM auth_sessions
     INNER JOIN users ON users.id = auth_sessions.user_id
     WHERE auth_sessions.id = ?1
     LIMIT 1`,
  )
    .bind(sessionId)
    .first()

  if (!session) {
    return null
  }

  if (Date.parse(session.expires_at) <= Date.now()) {
    await destroySession(env, session.id)
    return null
  }

  return {
    id: session.id,
    userId: session.user_id,
    expiresAt: session.expires_at,
  }
}