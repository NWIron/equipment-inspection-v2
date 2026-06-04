const FEATURE_SORT_ORDER = {
  equipment: 10,
  'inspection-tasks': 20,
  'work-orders': 30,
  'data-analysis': 40,
  'audit-logs': 50,
  'access-management': 60,
}

async function ensureAccessSeedData(env) {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO features (id, title, summary, category, path, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).bind(
      'data-analysis',
      '数据分析',
      '汇总点检、维修与设备数据，支持后续分析看板扩展。',
      'Analytics',
      '/modules/data-analysis',
      40,
    ),
    env.DB.prepare(
      'INSERT OR IGNORE INTO role_features (role_id, feature_id) VALUES (?1, ?2)',
    ).bind('role-administrator', 'data-analysis'),
    env.DB.prepare(
      `INSERT OR IGNORE INTO features (id, title, summary, category, path, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).bind(
      'audit-logs',
      '日志审计',
      '记录系统内新增、更新、删除操作，并提供筛选报表。',
      'Governance',
      '/modules/audit-logs',
      50,
    ),
    env.DB.prepare(
      'INSERT OR IGNORE INTO role_features (role_id, feature_id) VALUES (?1, ?2)',
    ).bind('role-administrator', 'audit-logs'),
  ])
}

function mapUsers(userRows, userRoleRows) {
  const roleIdsByUser = userRoleRows.reduce((lookup, row) => {
    lookup[row.user_id] ??= []
    lookup[row.user_id].push(row.role_id)
    return lookup
  }, {})

  return userRows.map((user) => ({
    id: user.id,
    accountName: user.account_name,
    name: user.name,
    email: user.email,
    phone: user.phone,
    disabled: Boolean(user.disabled),
    lastLoginAt: user.last_login_at,
    roleIds: roleIdsByUser[user.id] ?? [],
  }))
}

function mapRoles(roleRows, roleFeatureRows) {
  const featuresByRole = roleFeatureRows.reduce((lookup, row) => {
    lookup[row.role_id] ??= []
    lookup[row.role_id].push(row.feature_id)
    return lookup
  }, {})

  return roleRows.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: Boolean(role.is_system),
    featureIds: (featuresByRole[role.id] ?? []).sort(
      (left, right) => (FEATURE_SORT_ORDER[left] ?? 999) - (FEATURE_SORT_ORDER[right] ?? 999),
    ),
  }))
}

async function loadUsers(env, userIds = null) {
  const userFilters = Array.isArray(userIds) && userIds.length
  const userPlaceholders = userFilters ? userIds.map((_, index) => `?${index + 1}`).join(', ') : ''
  const userQuery = [
    'SELECT id, account_name, name, email, phone, disabled, last_login_at FROM users',
    userFilters ? `WHERE id IN (${userPlaceholders})` : '',
    'ORDER BY disabled ASC, account_name ASC',
  ]
    .filter(Boolean)
    .join(' ')

  const userRows = (await env.DB.prepare(userQuery).bind(...(userIds ?? [])).all()).results ?? []

  if (!userRows.length) {
    return []
  }

  const rolePlaceholders = userRows.map((_, index) => `?${index + 1}`).join(', ')
  const userRoleRows = (
    await env.DB.prepare(`SELECT user_id, role_id FROM user_roles WHERE user_id IN (${rolePlaceholders})`)
      .bind(...userRows.map((user) => user.id))
      .all()
  ).results ?? []

  return mapUsers(userRows, userRoleRows)
}

async function loadRoles(env, roleIds = null) {
  const roleFilters = Array.isArray(roleIds) && roleIds.length
  const rolePlaceholders = roleFilters ? roleIds.map((_, index) => `?${index + 1}`).join(', ') : ''
  const roleQuery = [
    'SELECT id, name, description, is_system FROM roles',
    roleFilters ? `WHERE id IN (${rolePlaceholders})` : '',
    'ORDER BY is_system DESC, name ASC',
  ]
    .filter(Boolean)
    .join(' ')

  const roleRows = (await env.DB.prepare(roleQuery).bind(...(roleIds ?? [])).all()).results ?? []

  if (!roleRows.length) {
    return []
  }

  const featurePlaceholders = roleRows.map((_, index) => `?${index + 1}`).join(', ')
  const roleFeatureRows = (
    await env.DB.prepare(
      `SELECT role_id, feature_id FROM role_features WHERE role_id IN (${featurePlaceholders})`,
    )
      .bind(...roleRows.map((role) => role.id))
      .all()
  ).results ?? []

  return mapRoles(roleRows, roleFeatureRows)
}

export function hasFeature(roleList, featureId) {
  return roleList.some((role) => role.featureIds.includes(featureId))
}

export function buildBlankAccessPayload() {
  return {
    sessionUserId: null,
    activeUser: null,
    activeRoles: [],
    users: [],
    roles: [],
  }
}

export async function buildAccessPayloadForUser(env, userId) {
  await ensureAccessSeedData(env)

  if (!userId) {
    return buildBlankAccessPayload()
  }

  const [activeUser] = await loadUsers(env, [userId])

  if (!activeUser || activeUser.disabled) {
    return buildBlankAccessPayload()
  }

  const activeRoles = await loadRoles(env, activeUser.roleIds)
  let users = []
  let roles = []

  if (hasFeature(activeRoles, 'access-management')) {
    ;[users, roles] = await Promise.all([loadUsers(env), loadRoles(env)])
  }

  return {
    sessionUserId: activeUser.id,
    activeUser,
    activeRoles,
    users,
    roles,
  }
}

export async function buildAccessPayload(env, request, getSession) {
  const session = await getSession(request, env)

  if (!session) {
    return buildBlankAccessPayload()
  }

  return buildAccessPayloadForUser(env, session.userId)
}

export async function requireFeatureAccess(request, env, getSession, featureId, failure) {
  const session = await getSession(request, env)

  if (!session) {
    return { error: failure('请先登录。', 401) }
  }

  const payload = await buildAccessPayloadForUser(env, session.userId)

  if (!payload.activeUser) {
    return { error: failure('当前会话已失效，请重新登录。', 401) }
  }

  if (featureId && !hasFeature(payload.activeRoles, featureId)) {
    return { error: failure('当前账号无权执行该操作。', 403) }
  }

  return {
    session,
    payload,
  }
}