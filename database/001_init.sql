PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS role_features (
  role_id TEXT NOT NULL,
  feature_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, feature_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_features_feature_id ON role_features(feature_id);

INSERT OR REPLACE INTO features (id, title, summary, category, path, sort_order)
VALUES
  ('equipment', '设备管理', '维护设备台账、位置、状态与生命周期信息。', 'Asset', '/modules/equipment', 10),
  ('inspection-tasks', '点检任务', '编排点检计划、执行清单与异常闭环任务。', 'Inspection', '/modules/inspection-tasks', 20),
  ('work-orders', '维修工单', '管理报修、派工、维修记录与状态跟踪。', 'Maintenance', '/modules/work-orders', 30),
  ('access-management', '用户与权限管理', '维护用户主数据、角色与功能卡片授权关系。', 'Security', '/admin/access', 40);

INSERT OR REPLACE INTO roles (id, name, description, is_system)
VALUES
  ('role-administrator', '管理员', '拥有全部功能卡片和系统维护权限。', 1),
  ('role-inspector', '点检员', '专注执行点检任务与现场结果反馈。', 1),
  ('role-equipment-engineer', '设备工程师', '负责设备管理与维修工单处理。', 1);

INSERT OR REPLACE INTO role_features (role_id, feature_id)
VALUES
  ('role-administrator', 'equipment'),
  ('role-administrator', 'inspection-tasks'),
  ('role-administrator', 'work-orders'),
  ('role-administrator', 'access-management'),
  ('role-inspector', 'inspection-tasks'),
  ('role-equipment-engineer', 'equipment'),
  ('role-equipment-engineer', 'work-orders');

INSERT OR REPLACE INTO users (
  id,
  account_name,
  name,
  email,
  phone,
  password_hash,
  password_salt,
  disabled
)
VALUES
  (
    'user-admin',
    'admin',
    '系统管理员',
    'admin@mettlertoledo.com',
    '13800000001',
    '6abea6aaba9f3ecd9933dd4bd8d9bd1a87e32e279384f79b3de9fd306a979a67',
    'seed-admin-salt',
    0
  ),
  (
    'user-inspector',
    'inspector.li',
    '李点检',
    'inspector@mettlertoledo.com',
    '13800000002',
    '69dff074903addcb025983a8979e0345e14fa676d32792ef11346061332d2ed8',
    'seed-inspector-salt',
    0
  ),
  (
    'user-engineer',
    'engineer.zhang',
    '张工程师',
    'engineer@mettlertoledo.com',
    '13800000003',
    '37e1573838f0692663d36395e905a9fe3ef11397b0efbc51fa8b66bd463ccbbf',
    'seed-engineer-salt',
    0
  );

INSERT OR REPLACE INTO user_roles (user_id, role_id)
VALUES
  ('user-admin', 'role-administrator'),
  ('user-inspector', 'role-inspector'),
  ('user-engineer', 'role-equipment-engineer');