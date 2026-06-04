export const DEFAULT_LOCALE = 'zh-CN'
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US']
export const LOCALE_STORAGE_KEY = 'equipment-inspection-locale'

export const messages = {
  'zh-CN': {
    common: {
      localeLabel: '语言',
      localeShort: {
        'zh-CN': '中文',
        'en-US': 'EN',
      },
      unassignedRole: '未分配角色',
      close: '关闭',
    },
    shell: {
      home: '主页',
      startScan: '扫描设备二维码',
      startingScan: '扫码启动中',
      signOut: '退出登录',
      signingOut: '退出中',
      signingOutLabel: '退出中...',
      footer: '© 2026 METTLER TOLEDO, Inc.',
      scanKicker: 'QR Scan',
      scanTitle: '扫描设备二维码',
      closeScan: '关闭扫码',
      scanHint: '请将设备编码二维码置于取景框内，识别后将自动进入对应点检任务或打开新建点检任务。',
      scanErrors: {
        invalidCode: '二维码中未识别到设备编码，请重新扫描。',
        noCamera: '当前设备未检测到可用摄像头。',
        openFailed: '无法打开扫码界面，请重试。',
        openFailedGeneric: '打开扫码失败，请稍后重试。',
      },
    },
    featureCard: {
      enter: '进入模块',
    },
    features: {
      equipment: {
        title: '设备管理',
        summary: '维护设备台账、位置、状态与生命周期信息。',
        category: 'Asset',
        phaseLabel: '一期开发中',
      },
      inspectionTasks: {
        title: '点检任务',
        summary: '编排点检计划、执行清单与异常闭环任务。',
        category: 'Inspection',
        phaseLabel: '一期开发中',
      },
      workOrders: {
        title: '维修工单',
        summary: '管理报修、派工、维修记录与状态跟踪。',
        category: 'Maintenance',
        phaseLabel: '一期开发中',
      },
      dataAnalysis: {
        title: '数据分析',
        summary: '汇总点检、维修与设备数据，支持后续分析看板扩展。',
        category: 'Analytics',
        phaseLabel: '报表预览',
      },
      accessManagement: {
        title: '用户与权限管理',
        summary: '维护用户主数据、角色与功能卡片授权关系。',
        category: 'Security',
        phaseLabel: '一期完成',
      },
    },
    roles: {
      administrator: {
        name: '管理员',
        description: '拥有全部功能卡片和系统维护权限。',
      },
      inspector: {
        name: '点检员',
        description: '专注执行点检任务与现场结果反馈。',
      },
      equipmentEngineer: {
        name: '设备工程师',
        description: '负责设备管理与维修工单处理。',
      },
    },
  },
  'en-US': {
    common: {
      localeLabel: 'Language',
      localeShort: {
        'zh-CN': '中文',
        'en-US': 'EN',
      },
      unassignedRole: 'No role assigned',
      close: 'Close',
    },
    shell: {
      home: 'Home',
      startScan: 'Scan equipment QR',
      startingScan: 'Starting scanner',
      signOut: 'Sign out',
      signingOut: 'Signing out',
      signingOutLabel: 'Signing out...',
      footer: '© 2026 METTLER TOLEDO, Inc.',
      scanKicker: 'QR Scan',
      scanTitle: 'Scan Equipment QR',
      closeScan: 'Close scanner',
      scanHint: 'Place the equipment code QR inside the frame. The app will open the related inspection task or a prefilled new task form automatically.',
      scanErrors: {
        invalidCode: 'No equipment code was detected in the QR code. Please scan again.',
        noCamera: 'No available camera was detected on this device.',
        openFailed: 'Unable to open the scanner. Please try again.',
        openFailedGeneric: 'Failed to start the scanner. Please try again later.',
      },
    },
    featureCard: {
      enter: 'Open module',
    },
    features: {
      equipment: {
        title: 'Equipment Management',
        summary: 'Maintain asset records, locations, status, and lifecycle information.',
        category: 'Asset',
        phaseLabel: 'Phase 1 in progress',
      },
      inspectionTasks: {
        title: 'Inspection Tasks',
        summary: 'Plan inspection work, execute checklists, and close abnormal findings.',
        category: 'Inspection',
        phaseLabel: 'Phase 1 in progress',
      },
      workOrders: {
        title: 'Work Orders',
        summary: 'Manage repair requests, dispatching, maintenance records, and status tracking.',
        category: 'Maintenance',
        phaseLabel: 'Phase 1 in progress',
      },
      dataAnalysis: {
        title: 'Data Analysis',
        summary: 'Combine inspection, maintenance, and equipment data for analytics dashboards.',
        category: 'Analytics',
        phaseLabel: 'Report preview',
      },
      accessManagement: {
        title: 'Users and Access',
        summary: 'Maintain user master data, roles, and feature-card permissions.',
        category: 'Security',
        phaseLabel: 'Phase 1 complete',
      },
    },
    roles: {
      administrator: {
        name: 'Administrator',
        description: 'Full access to all feature cards and system maintenance capabilities.',
      },
      inspector: {
        name: 'Inspector',
        description: 'Focused on inspection execution and field feedback.',
      },
      equipmentEngineer: {
        name: 'Equipment Engineer',
        description: 'Responsible for equipment records and work-order handling.',
      },
    },
  },
}