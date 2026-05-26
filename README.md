# equipment-inspection-v2

一期实现了设备点检系统的门户框架、邮箱密码登录，以及用户与权限管理。当前版本已补齐 Cloudflare Pages Functions + D1 的一期数据底座。

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
npm run cf-typegen
npm run dev
```

如果要联调真实登录和权限 API，请使用 Pages 本地预览而不是纯 Vite：

```sh
npm run db:init:local
npm run preview
```

## D1 初始化

1. 先执行 `wrangler d1 create equipment_inspection_v2`
2. 将返回的 `database_id` 写回 [wrangler.jsonc](wrangler.jsonc)
3. 本地初始化执行 `npm run db:init:local`
4. 远端初始化执行 `npm run db:init:remote`

当前建表和种子数据位于 [database/001_init.sql](database/001_init.sql)。

## 构建

```sh
npm run build
```

## 后续建议

- 补充用户编辑、角色编辑和密码重置流程
- 接入 Azure AD 单点登录
- 细化设备管理、点检任务、维修工单的数据模型与流程
