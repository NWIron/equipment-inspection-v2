export const FEATURE_CATALOG = [
  {
    id: 'equipment',
    title: '设备管理',
    summary: '维护设备台账、位置、状态与生命周期信息。',
    category: 'Asset',
    shortLabel: 'EM',
    accent: 'teal',
    phaseLabel: '一期开发中',
    path: '/modules/equipment',
  },
  {
    id: 'inspection-tasks',
    title: '点检任务',
    summary: '编排点检计划、执行清单与异常闭环任务。',
    category: 'Inspection',
    shortLabel: 'IT',
    accent: 'blue',
    phaseLabel: '一期开发中',
    path: '/modules/inspection-tasks',
  },
  {
    id: 'work-orders',
    title: '维修工单',
    summary: '管理报修、派工、维修记录与状态跟踪。',
    category: 'Maintenance',
    shortLabel: 'WO',
    accent: 'amber',
    phaseLabel: '一期开发中',
    path: '/modules/work-orders',
  },
  {
    id: 'data-analysis',
    title: '数据分析',
    summary: '汇总点检、维修与设备数据，支持后续分析看板扩展。',
    category: 'Analytics',
    shortLabel: 'DA',
    accent: 'slate',
    phaseLabel: '规划中',
    path: '/modules/data-analysis',
  },
  {
    id: 'access-management',
    title: '用户与权限管理',
    summary: '维护用户主数据、角色与功能卡片授权关系。',
    category: 'Security',
    shortLabel: 'UA',
    accent: 'slate',
    phaseLabel: '一期完成',
    path: '/admin/access',
  },
]

export const SEED_ROLES = [
  {
    id: 'role-administrator',
    name: '管理员',
    description: '拥有全部功能卡片和系统维护权限。',
    featureIds: FEATURE_CATALOG.map((feature) => feature.id),
    isSystem: true,
  },
  {
    id: 'role-inspector',
    name: '点检员',
    description: '专注执行点检任务与现场结果反馈。',
    featureIds: ['inspection-tasks'],
    isSystem: true,
  },
  {
    id: 'role-equipment-engineer',
    name: '设备工程师',
    description: '负责设备管理与维修工单处理。',
    featureIds: ['equipment', 'work-orders'],
    isSystem: true,
  },
]

export const SEED_USERS = [
  {
    id: 'user-admin',
    accountName: 'admin',
    name: '系统管理员',
    email: 'admin@mettlertoledo.com',
    phone: '13800000001',
    password: 'Pass@123',
    roleIds: ['role-administrator'],
    disabled: false,
  },
  {
    id: 'user-inspector',
    accountName: 'inspector.li',
    name: '李点检',
    email: 'inspector@mettlertoledo.com',
    phone: '13800000002',
    password: 'Pass@123',
    roleIds: ['role-inspector'],
    disabled: false,
  },
  {
    id: 'user-engineer',
    accountName: 'engineer.zhang',
    name: '张工程师',
    email: 'engineer@mettlertoledo.com',
    phone: '13800000003',
    password: 'Pass@123',
    roleIds: ['role-equipment-engineer'],
    disabled: false,
  },
]

export function buildSeedState() {
  return {
    roles: SEED_ROLES.map((role) => ({
      ...role,
      featureIds: [...role.featureIds],
    })),
    users: SEED_USERS.map((user) => ({
      ...user,
      roleIds: [...user.roleIds],
    })),
    sessionUserId: null,
  }
}