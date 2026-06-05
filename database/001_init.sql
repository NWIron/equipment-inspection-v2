PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS work_order_photos;
DROP TABLE IF EXISTS work_order_spare_parts;
DROP TABLE IF EXISTS work_order_tasks;
DROP TABLE IF EXISTS work_orders;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS equipment_spare_parts;
DROP TABLE IF EXISTS spare_parts;
DROP TABLE IF EXISTS inspection_task_photos;
DROP TABLE IF EXISTS inspection_task_results;
DROP TABLE IF EXISTS inspection_tasks;

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

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_id TEXT,
  resource_label TEXT NOT NULL DEFAULT '',
  operator_user_id TEXT,
  operator_name TEXT NOT NULL DEFAULT '',
  request_path TEXT NOT NULL,
  request_method TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_user_id) REFERENCES users(id) ON DELETE SET NULL
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
  safety_stock INTEGER NOT NULL DEFAULT 0,
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
  task_number TEXT NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS inspection_task_photos (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  photo_data TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES inspection_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  source_inspection_task_id TEXT,
  equipment_id TEXT NOT NULL,
  fault_code_id TEXT,
  priority TEXT NOT NULL DEFAULT '中',
  created_at TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  creator_contact TEXT NOT NULL DEFAULT '',
  spare_parts_updated_at TEXT,
  confirmed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_inspection_task_id) REFERENCES inspection_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipment_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (fault_code_id) REFERENCES fault_codes(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_order_photos (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  photo_data TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_order_spare_parts (
  work_order_id TEXT NOT NULL,
  spare_part_id TEXT NOT NULL,
  required_quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (work_order_id, spare_part_id),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (spare_part_id) REFERENCES spare_parts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS work_order_tasks (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  engineer_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '进行中',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (engineer_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_feature_id ON audit_logs(feature_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator_user_id ON audit_logs(operator_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_features_feature_id ON role_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_task_list_items_inspection_item_id ON task_list_items(inspection_item_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assets_owner_user_id ON equipment_assets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_task_lists_task_list_id ON equipment_task_lists(task_list_id);
CREATE INDEX IF NOT EXISTS idx_equipment_spare_parts_spare_part_id ON equipment_spare_parts(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_equipment_id ON inspection_tasks(equipment_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_inspector_user_id ON inspection_tasks(inspector_user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_status ON inspection_tasks(status);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_task_number ON inspection_tasks(task_number);
CREATE INDEX IF NOT EXISTS idx_inspection_task_photos_task_id ON inspection_task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by_user_id ON work_orders(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_fault_code_id ON work_orders(fault_code_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_source_inspection_task_id ON work_orders(source_inspection_task_id);
CREATE INDEX IF NOT EXISTS idx_work_order_photos_work_order_id ON work_order_photos(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_spare_parts_spare_part_id ON work_order_spare_parts(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_work_order_tasks_work_order_id ON work_order_tasks(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_tasks_engineer_user_id ON work_order_tasks(engineer_user_id);

DELETE FROM auth_sessions;
DELETE FROM audit_logs;
DELETE FROM work_order_photos;
DELETE FROM work_order_spare_parts;
DELETE FROM work_order_tasks;
DELETE FROM work_orders;
DELETE FROM inspection_task_photos;
DELETE FROM inspection_task_results;
DELETE FROM inspection_tasks;
DELETE FROM equipment_task_lists;
DELETE FROM equipment_spare_parts;
DELETE FROM task_list_items;
DELETE FROM equipment_assets;
DELETE FROM spare_parts;
DELETE FROM task_lists;
DELETE FROM fault_codes;
DELETE FROM inspection_items;
DELETE FROM user_roles;
DELETE FROM role_features;
DELETE FROM users;
DELETE FROM roles;
DELETE FROM features;

INSERT OR REPLACE INTO features (id, title, summary, category, path, sort_order)
VALUES
  ('equipment', '设备管理', '维护设备台账、位置、状态与生命周期信息。', 'Asset', '/modules/equipment', 10),
  ('inspection-tasks', '点检任务', '编排点检计划、执行清单与异常闭环任务。', 'Inspection', '/modules/inspection-tasks', 20),
  ('work-orders', '维修工单', '管理报修、派工、维修记录与状态跟踪。', 'Maintenance', '/modules/work-orders', 30),
  ('data-analysis', '数据分析', '汇总点检、维修与设备数据，支持后续分析看板扩展。', 'Analytics', '/modules/data-analysis', 40),
  ('audit-logs', '日志审计', '记录系统内新增、更新、删除操作，并提供筛选报表。', 'Governance', '/modules/audit-logs', 50),
  ('access-management', '用户与权限管理', '维护用户主数据、角色与功能卡片授权关系。', 'Security', '/admin/access', 60);

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
  ('role-administrator', 'data-analysis'),
  ('role-administrator', 'audit-logs'),
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
  ('item-leveling', 'ITEM-002', '确认水平泡、支脚和安装底座状态。'),
  ('item-calibration-weight', 'ITEM-003', '使用标准砝码核对示值重复性与偏载误差。'),
  ('item-draft-shield', 'ITEM-004', '检查防风罩、称盘与样品腔体清洁度。'),
  ('item-belt-tracking', 'ITEM-005', '检查输送带跑偏、张紧度和导向轮磨损情况。'),
  ('item-detector-signal', 'ITEM-006', '验证金属检测灵敏度与剔除机构动作。'),
  ('item-heater-response', 'ITEM-007', '检查加热模块升温响应与温控报警。'),
  ('item-electrode-slope', 'ITEM-008', '检查 pH 电极斜率、零点和清洗状态。'),
  ('item-dosing-line', 'ITEM-009', '检查滴定泵、试剂管路及排液密封性。'),
  ('item-load-cell-zero', 'ITEM-010', '检查称重传感器零点漂移与接线牢靠性。');

INSERT OR REPLACE INTO fault_codes (id, fault_code, description)
VALUES
  ('fault-sensor-drift', 'FAULT-001', '称量传感器零点漂移或重复性偏差超限。'),
  ('fault-overheat', 'FAULT-002', '设备运行温度异常升高或散热不良。'),
  ('fault-communication', 'FAULT-003', '控制器、PLC 或上位系统通信中断。'),
  ('fault-metal-sensitivity', 'FAULT-004', '金属检测灵敏度下降，测试片验证不稳定。'),
  ('fault-conveyor-belt', 'FAULT-005', '输送带跑偏、打滑或导向轮磨损超限。'),
  ('fault-reject-actuator', 'FAULT-006', '剔除机构响应延迟或气缸动作异常。'),
  ('fault-loadcell-instability', 'FAULT-007', '称重传感器信号波动或零点不稳定。'),
  ('fault-electrode-aging', 'FAULT-008', 'pH 电极老化，斜率与零点校准失败。'),
  ('fault-pump-leakage', 'FAULT-009', '滴定泵密封失效，试剂管路存在渗漏。');

INSERT OR REPLACE INTO task_lists (id, task_list_code, description)
VALUES
  ('task-daily-balance', 'TASK-001', '实验室精密天平日检清单'),
  ('task-checkweigher-shift', 'TASK-002', '在线检重秤开机点检清单'),
  ('task-metal-detector-weekly', 'TASK-003', '金属检测机周验证清单'),
  ('task-titrator-routine', 'TASK-004', '自动电位滴定仪例行核查清单'),
  ('task-moisture-pm', 'TASK-005', '卤素水分测定仪保养点检清单'),
  ('task-floor-scale-weekly', 'TASK-006', '平台秤周点检清单');

INSERT OR REPLACE INTO task_list_items (task_list_id, inspection_item_id, sort_order)
VALUES
  ('task-daily-balance', 'item-appearance', 10),
  ('task-daily-balance', 'item-leveling', 20),
  ('task-daily-balance', 'item-calibration-weight', 30),
  ('task-daily-balance', 'item-draft-shield', 40),
  ('task-checkweigher-shift', 'item-appearance', 10),
  ('task-checkweigher-shift', 'item-belt-tracking', 20),
  ('task-checkweigher-shift', 'item-load-cell-zero', 30),
  ('task-metal-detector-weekly', 'item-appearance', 10),
  ('task-metal-detector-weekly', 'item-detector-signal', 20),
  ('task-metal-detector-weekly', 'item-belt-tracking', 30),
  ('task-titrator-routine', 'item-appearance', 10),
  ('task-titrator-routine', 'item-electrode-slope', 20),
  ('task-titrator-routine', 'item-dosing-line', 30),
  ('task-moisture-pm', 'item-appearance', 10),
  ('task-moisture-pm', 'item-heater-response', 20),
  ('task-moisture-pm', 'item-draft-shield', 30),
  ('task-floor-scale-weekly', 'item-appearance', 10),
  ('task-floor-scale-weekly', 'item-load-cell-zero', 20),
  ('task-floor-scale-weekly', 'item-calibration-weight', 30);

INSERT OR REPLACE INTO spare_parts (id, part_number, description, unit, stock_quantity, safety_stock)
VALUES
  ('spare-filter-kit', 'SP-001', '过滤组件维护包', '套', 12, 4),
  ('spare-sensor-head', 'SP-002', '高精度称量传感器探头总成', '个', 4, 2),
  ('spare-fuse-pack', 'SP-003', '保险丝套装', '盒', 18, 6),
  ('spare-conveyor-belt', 'SP-004', '在线检重秤输送带总成', '条', 3, 1),
  ('spare-test-piece-kit', 'SP-005', '金属检测测试片验证套装', '套', 6, 2),
  ('spare-ph-electrode', 'SP-006', 'InLab pH 电极组件', '支', 5, 2),
  ('spare-heater-module', 'SP-007', '卤素加热模块陶瓷组件', '套', 2, 1),
  ('spare-load-cell', 'SP-008', '平台秤称重传感器模块', '个', 3, 2),
  ('spare-pump-seal-kit', 'SP-009', '滴定泵密封与阀芯套件', '套', 4, 1);

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
    'equipment-checkweigher-002',
    'EQ-002',
    'C35 在线检重秤',
    '在用',
    '2027-08-31',
    '在线检重设备',
    'C35 AdvancedLine',
    '苏州工厂-包装线1',
    'user-engineer',
    '张工程师 / 13800000003',
    '2022-05-10',
    '2022-05-28',
    '8年',
    1
  ),
  (
    'equipment-metal-detector-003',
    'EQ-003',
    'M34R 金属检测机',
    '在用',
    '2027-09-30',
    '在线检测设备',
    'M34R',
    '苏州工厂-包装线1',
    'user-engineer',
    '张工程师 / 13800000003',
    '2022-05-10',
    '2022-05-28',
    '8年',
    7
  ),
  (
    'equipment-titrator-004',
    'EQ-004',
    'T9 自动电位滴定仪',
    '在用',
    '2028-03-31',
    '分析仪器',
    'T9 Excellence',
    '上海工厂-QC实验室B区',
    'user-engineer',
    '张工程师 / 13800000003',
    '2024-01-12',
    '2024-01-25',
    '10年',
    30
  ),
  (
    'equipment-moisture-005',
    'EQ-005',
    'HX204 卤素水分测定仪',
    '检修中',
    '2027-11-30',
    '分析仪器',
    'HX204',
    '常州工厂-原料实验室',
    'user-engineer',
    '张工程师 / 13800000003',
    '2023-06-18',
    '2023-07-03',
    '8年',
    14
  ),
  (
    'equipment-floor-scale-006',
    'EQ-006',
    'PFA579 物流月台平台秤',
    '在用',
    '2027-06-30',
    '工业称重设备',
    'PFA579',
    '昆山物流中心-月台3',
    'user-engineer',
    '张工程师 / 13800000003',
    '2020-09-06',
    '2020-09-28',
    '12年',
    7
  ),
  (
    'equipment-count-scale-007',
    'EQ-007',
    'ICS685 备件仓计数台秤',
    '待报废',
    '2026-12-31',
    '工业称重设备',
    'ICS685',
    '上海工厂-备件仓',
    'user-engineer',
    '张工程师 / 13800000003',
    '2018-04-20',
    '2018-05-05',
    '8年',
    14
  );

INSERT OR REPLACE INTO equipment_task_lists (equipment_id, task_list_id)
VALUES
  ('equipment-balance-001', 'task-daily-balance'),
  ('equipment-checkweigher-002', 'task-checkweigher-shift'),
  ('equipment-metal-detector-003', 'task-metal-detector-weekly'),
  ('equipment-titrator-004', 'task-titrator-routine'),
  ('equipment-moisture-005', 'task-moisture-pm'),
  ('equipment-floor-scale-006', 'task-floor-scale-weekly'),
  ('equipment-count-scale-007', 'task-floor-scale-weekly');

INSERT OR REPLACE INTO equipment_spare_parts (equipment_id, spare_part_id)
VALUES
  ('equipment-balance-001', 'spare-sensor-head'),
  ('equipment-balance-001', 'spare-fuse-pack'),
  ('equipment-checkweigher-002', 'spare-conveyor-belt'),
  ('equipment-checkweigher-002', 'spare-load-cell'),
  ('equipment-metal-detector-003', 'spare-test-piece-kit'),
  ('equipment-metal-detector-003', 'spare-fuse-pack'),
  ('equipment-titrator-004', 'spare-ph-electrode'),
  ('equipment-titrator-004', 'spare-pump-seal-kit'),
  ('equipment-moisture-005', 'spare-heater-module'),
  ('equipment-moisture-005', 'spare-fuse-pack'),
  ('equipment-floor-scale-006', 'spare-load-cell'),
  ('equipment-floor-scale-006', 'spare-fuse-pack'),
  ('equipment-count-scale-007', 'spare-load-cell');

INSERT OR REPLACE INTO inspection_tasks (
  id,
  task_number,
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
    'inspection-task-balance-0602',
    'IT-20260602-001',
    'XPR205 电子天平日常点检',
    '2026-06-02T08:30',
    'equipment-balance-001',
    'user-inspector',
    NULL,
    '',
    '中',
    '已完成',
    '2026-06-02T08:48'
  ),
  (
    'inspection-task-checkweigher-0604',
    'IT-20260604-001',
    'C35 在线检重秤开机点检',
    '2026-06-04T07:40',
    'equipment-checkweigher-002',
    'user-inspector',
    'fault-conveyor-belt',
    '进料端输送带轻微跑偏，需要安排维护调整。',
    '高',
    '执行中',
    NULL
  ),
  (
    'inspection-task-metal-detector-0603',
    'IT-20260603-001',
    'M34R 金属检测机周验证',
    '2026-06-03T14:00',
    'equipment-metal-detector-003',
    'user-inspector',
    'fault-metal-sensitivity',
    'Fe 与 Non-Fe 测试片响应边界偏低，需重新标定。',
    '紧急',
    '已完成',
    '2026-06-03T14:35'
  ),
  (
    'inspection-task-titrator-0605',
    'IT-20260605-001',
    'T9 自动电位滴定仪例行核查',
    '2026-06-05T09:20',
    'equipment-titrator-004',
    'user-inspector',
    NULL,
    '',
    '中',
    '待执行',
    NULL
  ),
  (
    'inspection-task-moisture-0605',
    'IT-20260605-002',
    'HX204 水分仪保养点检',
    '2026-06-05T10:10',
    'equipment-moisture-005',
    'user-inspector',
    'fault-overheat',
    '加热升温时间偏长，已提交维修工单。',
    '高',
    '已完成',
    '2026-06-05T10:42'
  ),
  (
    'inspection-task-floor-scale-0601',
    'IT-20260601-001',
    'PFA579 平台秤周点检',
    '2026-06-01T15:00',
    'equipment-floor-scale-006',
    'user-inspector',
    'fault-loadcell-instability',
    '零点波动超出基准，建议更换称重传感器。',
    '高',
    '已完成',
    '2026-06-01T15:36'
  );

INSERT OR REPLACE INTO inspection_task_results (
  task_id,
  inspection_item_id,
  sort_order,
  result_status,
  remark
)
VALUES
  ('inspection-task-balance-0602', 'item-appearance', 10, '正常', '外观、铭牌与附件状态良好。'),
  ('inspection-task-balance-0602', 'item-leveling', 20, '正常', '水平泡居中，支脚锁紧。'),
  ('inspection-task-balance-0602', 'item-calibration-weight', 30, '正常', '200g 标准砝码示值偏差 0.0003g。'),
  ('inspection-task-balance-0602', 'item-draft-shield', 40, '正常', '防风罩与称盘已完成清洁。'),
  ('inspection-task-checkweigher-0604', 'item-appearance', 10, '正常', '护罩、光电与机架状态正常。'),
  ('inspection-task-checkweigher-0604', 'item-belt-tracking', 20, '异常', '进料端输送带向左跑偏约 2 mm。'),
  ('inspection-task-checkweigher-0604', 'item-load-cell-zero', 30, '正常', '零点稳定，动态测试合格。'),
  ('inspection-task-metal-detector-0603', 'item-appearance', 10, '正常', '设备外观与气源状态正常。'),
  ('inspection-task-metal-detector-0603', 'item-detector-signal', 20, '异常', 'Fe/Non-Fe 测试片触发阈值低于基准。'),
  ('inspection-task-metal-detector-0603', 'item-belt-tracking', 30, '正常', '输送带张紧度与导向轮状态正常。'),
  ('inspection-task-titrator-0605', 'item-appearance', 10, '待检', ''),
  ('inspection-task-titrator-0605', 'item-electrode-slope', 20, '待检', ''),
  ('inspection-task-titrator-0605', 'item-dosing-line', 30, '待检', ''),
  ('inspection-task-moisture-0605', 'item-appearance', 10, '正常', '腔体与称盘清洁完成。'),
  ('inspection-task-moisture-0605', 'item-heater-response', 20, '异常', '升温至 160C 耗时高于标准 18%。'),
  ('inspection-task-moisture-0605', 'item-draft-shield', 30, '正常', '样品腔门闭合与观察窗状态正常。'),
  ('inspection-task-floor-scale-0601', 'item-appearance', 10, '正常', '秤台无明显变形，接线盒固定良好。'),
  ('inspection-task-floor-scale-0601', 'item-load-cell-zero', 20, '异常', '零点波动 1.8kg，信号稳定性不足。'),
  ('inspection-task-floor-scale-0601', 'item-calibration-weight', 30, '异常', '500kg 标准砝码误差 0.42%，超出基准。');

INSERT OR REPLACE INTO work_orders (
  id,
  order_number,
  source_inspection_task_id,
  equipment_id,
  fault_code_id,
  priority,
  created_at,
  created_by_user_id,
  creator_contact,
  confirmed_at
)
VALUES
  (
    'work-order-checkweigher-001',
    'WO-20260604-001',
    NULL,
    'equipment-checkweigher-002',
    'fault-conveyor-belt',
    '高',
    '2026-06-04T10:10',
    'user-engineer',
    '张工程师 / 13800000003',
    NULL
  ),
  (
    'work-order-metal-002',
    'WO-20260603-001',
    'inspection-task-metal-detector-0603',
    'equipment-metal-detector-003',
    'fault-metal-sensitivity',
    '紧急',
    '2026-06-03T15:10',
    'user-admin',
    '系统管理员 / 13800000001',
    NULL
  ),
  (
    'work-order-titrator-003',
    'WO-20260604-002',
    NULL,
    'equipment-titrator-004',
    'fault-electrode-aging',
    '中',
    '2026-06-04T14:20',
    'user-engineer',
    '张工程师 / 13800000003',
    NULL
  ),
  (
    'work-order-moisture-004',
    'WO-20260605-001',
    'inspection-task-moisture-0605',
    'equipment-moisture-005',
    'fault-overheat',
    '高',
    '2026-06-05T10:50',
    'user-inspector',
    '李点检 / 13800000002',
    NULL
  ),
  (
    'work-order-floor-scale-005',
    'WO-20260601-001',
    'inspection-task-floor-scale-0601',
    'equipment-floor-scale-006',
    'fault-loadcell-instability',
    '高',
    '2026-06-01T16:10',
    'user-admin',
    '系统管理员 / 13800000001',
    '2026-06-02T10:15'
  );

INSERT OR REPLACE INTO work_order_spare_parts (work_order_id, spare_part_id, required_quantity)
VALUES
  ('work-order-metal-002', 'spare-test-piece-kit', 1),
  ('work-order-metal-002', 'spare-fuse-pack', 1),
  ('work-order-titrator-003', 'spare-ph-electrode', 1),
  ('work-order-moisture-004', 'spare-heater-module', 1),
  ('work-order-moisture-004', 'spare-fuse-pack', 1),
  ('work-order-floor-scale-005', 'spare-load-cell', 1);

INSERT OR REPLACE INTO work_order_tasks (
  id,
  work_order_id,
  task_name,
  engineer_user_id,
  status
)
VALUES
  ('work-order-task-001', 'work-order-metal-002', '重新标定金属检测灵敏度', 'user-engineer', '进行中'),
  ('work-order-task-002', 'work-order-metal-002', '复测测试片并记录验证报告', 'user-engineer', '完成'),
  ('work-order-task-003', 'work-order-titrator-003', '更换电极组件并复核终点漂移', 'user-engineer', '待验收'),
  ('work-order-task-004', 'work-order-moisture-004', '更换加热模块陶瓷组件', 'user-engineer', '完成'),
  ('work-order-task-005', 'work-order-moisture-004', '复核升温曲线与温控报警', 'user-engineer', '完成'),
  ('work-order-task-006', 'work-order-floor-scale-005', '更换称重传感器并完成角差调整', 'user-engineer', '完成'),
  ('work-order-task-007', 'work-order-floor-scale-005', '复核 500kg 标准载荷示值', 'user-engineer', '完成');

INSERT OR REPLACE INTO audit_logs (
  id,
  feature_id,
  resource_type,
  action,
  resource_id,
  resource_label,
  operator_user_id,
  operator_name,
  request_path,
  request_method,
  payload_json,
  created_at
)
VALUES
  (
    'audit-log-001',
    'equipment',
    'equipment',
    'CREATE',
    'equipment-metal-detector-003',
    'M34R 金属检测机',
    'user-engineer',
    '张工程师',
    '/api/equipment',
    'POST',
    '{"equipmentCode":"EQ-003","location":"苏州工厂-包装线1","model":"M34R"}',
    '2026-05-26T10:15:00'
  ),
  (
    'audit-log-002',
    'equipment',
    'task-list',
    'UPDATE',
    'task-metal-detector-weekly',
    '金属检测机周验证清单',
    'user-admin',
    '系统管理员',
    '/api/task-lists/task-metal-detector-weekly',
    'PUT',
    '{"description":"增加测试片验证与输送带复核项"}',
    '2026-05-27T09:42:00'
  ),
  (
    'audit-log-003',
    'inspection-tasks',
    'inspection-task',
    'CREATE',
    'inspection-task-metal-detector-0603',
    'M34R 金属检测机周验证',
    'user-admin',
    '系统管理员',
    '/api/inspection-tasks',
    'POST',
    '{"taskNumber":"IT-20260603-001","priority":"紧急","equipmentId":"equipment-metal-detector-003"}',
    '2026-06-03T13:58:00'
  ),
  (
    'audit-log-004',
    'inspection-tasks',
    'inspection-task-results',
    'UPDATE',
    'inspection-task-metal-detector-0603',
    'M34R 金属检测机周验证结果',
    'user-inspector',
    '李点检',
    '/api/inspection-tasks/inspection-task-metal-detector-0603/results',
    'PUT',
    '{"abnormalCount":1,"faultCodeId":"fault-metal-sensitivity"}',
    '2026-06-03T14:31:00'
  ),
  (
    'audit-log-005',
    'work-orders',
    'work-order',
    'CREATE',
    'work-order-metal-002',
    'WO-20260603-001',
    'user-admin',
    '系统管理员',
    '/api/work-orders',
    'POST',
    '{"orderNumber":"WO-20260603-001","priority":"紧急","sourceInspectionTaskId":"inspection-task-metal-detector-0603"}',
    '2026-06-03T15:11:00'
  ),
  (
    'audit-log-006',
    'work-orders',
    'work-order-spare-parts',
    'UPDATE',
    'work-order-moisture-004',
    'WO-20260605-001 备件清单',
    'user-engineer',
    '张工程师',
    '/api/work-orders/work-order-moisture-004/spare-parts',
    'PUT',
    '{"items":[{"sparePartId":"spare-heater-module","requiredQuantity":1},{"sparePartId":"spare-fuse-pack","requiredQuantity":1}]}',
    '2026-06-05T11:02:00'
  ),
  (
    'audit-log-007',
    'access-management',
    'user',
    'UPDATE',
    'user-inspector',
    '李点检',
    'user-admin',
    '系统管理员',
    '/api/users/user-inspector',
    'PUT',
    '{"phone":"13800000002","roleIds":["role-inspector"]}',
    '2026-06-02T09:18:00'
  ),
  (
    'audit-log-008',
    'equipment',
    'spare-part',
    'DELETE',
    'spare-obsolete-board',
    '旧版接口板套件',
    'user-engineer',
    '张工程师',
    '/api/spare-parts/spare-obsolete-board',
    'DELETE',
    '',
    '2026-05-30T17:26:00'
  );