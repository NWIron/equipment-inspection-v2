# equipment-inspection-v2

一期实现了设备点检系统的门户框架、邮箱密码登录，以及用户与权限管理的前端演示版本，适配桌面端和移动端，便于后续接入 Cloudflare Pages + D1。

## 当前范围

- 登录页：邮箱 + 密码登录，预留 Azure AD SSO 按钮
- 工作台：首页按角色显示功能卡片
- 用户与权限管理：用户创建、禁用、删除，角色创建、删除、权限卡片分配
- 模块占位页：设备管理、点检任务、维修工单的后续开发入口

## 演示账号

所有演示账号初始密码均为 `Pass@123`

- 管理员：`admin@mettlertoledo.com`
- 点检员：`inspector@mettlertoledo.com`
- 设备工程师：`engineer@mettlertoledo.com`

## 本地运行

```sh
npm install
npm run dev
```

## 构建

```sh
npm run build
```

## 后续建议

- 将 Pinia 中的演示数据替换为 D1 API
- 接入 Azure AD 单点登录
- 细化设备管理、点检任务、维修工单的数据模型与流程
