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

CREATE TABLE IF NOT EXISTS inspection_items (
  id TEXT PRIMARY KEY,
  item_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fault_codes (
  id TEXT PRIMARY KEY,
  fault_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_lists (
  id TEXT PRIMARY KEY,
  task_list_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_list_items (
  task_list_id TEXT NOT NULL,
  inspection_item_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_list_id, inspection_item_id),
  FOREIGN KEY (task_list_id) REFERENCES task_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (inspection_item_id) REFERENCES inspection_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spare_parts (
  id TEXT PRIMARY KEY,
  part_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '件',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment_assets (
  id TEXT PRIMARY KEY,
  equipment_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  valid_until TEXT,
  type TEXT,
  model TEXT,
  location TEXT,
  owner_user_id TEXT,
  contact_info TEXT,
  purchase_date TEXT,
  commissioning_date TEXT,
  service_life TEXT,
  inspection_frequency_days INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS equipment_task_lists (
  equipment_id TEXT NOT NULL,
  task_list_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (equipment_id, task_list_id),
  FOREIGN KEY (equipment_id) REFERENCES equipment_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (task_list_id) REFERENCES task_lists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS equipment_spare_parts (
  equipment_id TEXT NOT NULL,
  spare_part_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (equipment_id, spare_part_id),
  FOREIGN KEY (equipment_id) REFERENCES equipment_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (spare_part_id) REFERENCES spare_parts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inspection_tasks (
  id TEXT PRIMARY KEY,
  task_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  inspector_user_id TEXT NOT NULL,
  fault_code_id TEXT,
  fault_note TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT '中',
  status TEXT NOT NULL DEFAULT '待执行',
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (inspector_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (fault_code_id) REFERENCES fault_codes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inspection_task_results (
  task_id TEXT NOT NULL,
  inspection_item_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  result_status TEXT NOT NULL DEFAULT '待检',
  remark TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, inspection_item_id),
  FOREIGN KEY (task_id) REFERENCES inspection_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (inspection_item_id) REFERENCES inspection_items(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_features_feature_id ON role_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_task_list_items_inspection_item_id ON task_list_items(inspection_item_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assets_owner_user_id ON equipment_assets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_task_lists_task_list_id ON equipment_task_lists(task_list_id);
CREATE INDEX IF NOT EXISTS idx_equipment_spare_parts_spare_part_id ON equipment_spare_parts(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_equipment_id ON inspection_tasks(equipment_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_inspector_user_id ON inspection_tasks(inspector_user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_status ON inspection_tasks(status);

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

INSERT OR REPLACE INTO inspection_items (id, item_code, description)
VALUES
  ('item-appearance', 'ITEM-001', '检查设备外观、铭牌和紧固状态。'),
  ('item-lubrication', 'ITEM-002', '确认润滑点状态和润滑记录是否正常。'),
  ('item-safety', 'ITEM-003', '检查急停、防护和安全联锁是否有效。');

INSERT OR REPLACE INTO fault_codes (id, fault_code, description)
VALUES
  ('fault-sensor-drift', 'FAULT-001', '传感器零点漂移或测量偏差超限。'),
  ('fault-overheat', 'FAULT-002', '设备运行温度异常升高。'),
  ('fault-communication', 'FAULT-003', '控制器或上位系统通信中断。');

INSERT OR REPLACE INTO task_lists (id, task_list_code, description)
VALUES
  ('task-daily-balance', 'TASK-001', '电子天平日常点检清单'),
  ('task-weekly-line', 'TASK-002', '产线关键设备周点检清单');

INSERT OR REPLACE INTO task_list_items (task_list_id, inspection_item_id, sort_order)
VALUES
  ('task-daily-balance', 'item-appearance', 10),
  ('task-daily-balance', 'item-safety', 20),
  ('task-weekly-line', 'item-appearance', 10),
  ('task-weekly-line', 'item-lubrication', 20),
  ('task-weekly-line', 'item-safety', 30);

INSERT OR REPLACE INTO spare_parts (id, part_number, description, unit, stock_quantity)
VALUES
  ('spare-filter-kit', 'SP-001', '过滤组件维护包', '套', 12),
  ('spare-sensor-head', 'SP-002', '传感器探头总成', '个', 4),
  ('spare-fuse-pack', 'SP-003', '保险丝套装', '盒', 18);

INSERT OR REPLACE INTO equipment_assets (
  id,
  equipment_code,
  description,
  status,
  valid_until,
  type,
  model,
  location,
  owner_user_id,
  contact_info,
  purchase_date,
  commissioning_date,
  service_life,
  inspection_frequency_days
)
VALUES
  (
    'equipment-balance-001',
    'EQ-001',
    '实验室精密电子天平',
    '在用',
    '2027-12-31',
    '称量设备',
    'XPR205',
    '上海工厂-实验室A区',
    'user-engineer',
    '张工程师 / 13800000003',
    '2023-02-15',
    '2023-03-01',
    '10年',
    7
  ),
  (
    'equipment-line-oven-002',
    'EQ-002',
    '产线固化炉',
    '检修中',
    '2026-10-31',
    '热处理设备',
    'HT-480',
    '苏州工厂-产线2',
    'user-engineer',
    '设备工程组 / 13800000003',
    '2021-08-20',
    '2021-09-01',
    '12年',
    14
  );

INSERT OR REPLACE INTO equipment_task_lists (equipment_id, task_list_id)
VALUES
  ('equipment-balance-001', 'task-daily-balance'),
  ('equipment-line-oven-002', 'task-weekly-line');

INSERT OR REPLACE INTO equipment_spare_parts (equipment_id, spare_part_id)
VALUES
  ('equipment-balance-001', 'spare-sensor-head'),
  ('equipment-line-oven-002', 'spare-filter-kit'),
  ('equipment-line-oven-002', 'spare-fuse-pack');

INSERT OR REPLACE INTO inspection_tasks (
  id,
  task_name,
  created_at,
  equipment_id,
  inspector_user_id,
  fault_code_id,
  fault_note,
  priority,
  status,
  completed_at
)
VALUES
  (
    'inspection-task-balance-daily',
    '电子天平日常点检',
    '2026-05-28T09:00',
    'equipment-balance-001',
    'user-inspector',
    NULL,
    '',
    '中',
    '待执行',
    NULL
  );

INSERT OR REPLACE INTO inspection_task_results (
  task_id,
  inspection_item_id,
  sort_order,
  result_status,
  remark
)
VALUES
  ('inspection-task-balance-daily', 'item-appearance', 10, '待检', ''),
  ('inspection-task-balance-daily', 'item-safety', 20, '待检', '');