# equipment-inspection-v2

该项目用于演示设备点检与维修协同场景，当前版本已基于 Cloudflare Pages Functions + D1 补齐可运行的数据底座、权限体系和多模块业务流，并提供适合梅特勒托利多场景的样例数据。

## 当前范围

- 登录与权限：邮箱 + 密码登录，D1 会话鉴权，首页按角色显示功能卡片，预留 Azure AD SSO 入口
- 用户与权限管理：用户创建、禁用、删除，角色创建、删除，角色与功能卡片授权维护
- 设备管理：设备主数据、点检清单、点检项、故障代码、备件的创建、修改、删除与关联维护
- 点检任务：任务创建、执行、结果回填，按设备自动带出对应点检项
- 维修工单：工单创建、任务分派、备件关联与处理状态跟踪
- 日志审计：记录新增、更新、删除操作，并以筛选报表形式展示
- 数据分析：基于现有业务数据聚合的前端演示看板
- 全局多语言：基于 vue-i18n 提供中文与英文静态文本切换

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

## D1 初始化与同步

1. 先执行 `wrangler d1 create equipment_inspection_v2`
2. 将返回的 `database_id` 写回 [wrangler.jsonc](wrangler.jsonc)
3. 本地初始化执行 `npm run db:init:local`
4. 远端初始化执行 `npm run db:init:remote`

当前建表和种子数据位于 [database/001_init.sql](database/001_init.sql)，包含权限基础数据、设备主数据、点检任务、维修工单、日志审计以及用于 DEMO 的梅特勒托利多行业样例数据。

如果你已初始化过旧版本数据库，需要重新执行一次本地和远端 D1 初始化，让最新表结构和种子数据生效。

在当前这台 Windows 机器上，如果远端 Wrangler / D1 初始化遇到本地证书链问题，可临时使用以下方式执行远端同步：

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'
npm.cmd run db:init:remote
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
```

注意：`npm run db:init:remote` 会把 [database/001_init.sql](database/001_init.sql) 当前内容同步到 [wrangler.jsonc](wrangler.jsonc) 中配置的远端 D1 数据库。

## DEMO 数据

当前默认种子数据不会新增额外角色和用户，只保留以下 3 个演示身份：管理员、点检员、设备工程师。

在此基础上，样例数据已扩展为更完整的演示链路，包括：

- 实验室精密天平、在线检重秤、金属检测机、自动电位滴定仪、卤素水分测定仪、平台秤等设备
- 与设备类型匹配的点检清单、点检项和故障代码
- 多状态点检任务、异常结果、维修工单、工单任务和关联备件
- 用于日志审计模块展示的新增、更新、删除审计记录

## 构建

```sh
npm run build
```

## 后续建议

- 补充用户编辑、角色编辑和密码重置流程
- 接入 Azure AD 单点登录
- 继续细化维修闭环，例如验收、关闭、备件消耗出库与履历沉淀
- 为分析和审计模块补充更多跨工厂、跨产线的真实业务口径
