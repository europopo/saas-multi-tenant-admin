# SaaS 多租户管理平台模板

基于 **Vue 3 + TypeScript + Vite + pnpm Monorepo** 的可复用、可扩展的 SaaS 多租户管理平台前端模板。

包含一个完整的管理门户（portal），以及一个作为演示的「任务管理子系统」（task-system），用于验证门户、权限、路由、布局、组件和数据请求架构的可用性与可扩展性。

> 本项目为**纯前端 + Mock 数据**实现，无需后端即可运行，适合作为 SaaS 中后台脚手架、权限模型参考或产品原型。

---

## 目录

- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [快速开始](#快速开始)
- [演示账号](#演示账号)
- [核心特性](#核心特性)
- [核心架构](#核心架构)
  - [统一数据请求链路](#统一数据请求链路)
  - [权限模型（RBAC）](#权限模型rbac)
  - [菜单与动态路由](#菜单与动态路由)
  - [Mock 数据架构](#mock-数据架构)
- [功能清单](#功能清单)
- [扩展预留](#扩展预留)
- [已知限制](#已知限制)

---

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 语言 | TypeScript（strict 严格模式） |
| 构建 | Vite 5 |
| 包管理 | pnpm Workspace（Monorepo） |
| 路由 | Vue Router 4（路由守卫、动态路由、动态菜单） |
| 状态 | Pinia |
| 样式 | Tailwind CSS 3 + Element Plus 2（深浅主题） |
| 请求层 | Alova 3 + `@alova/mock` 2 |
| 模拟数据 | MockJS（内存数据库） |
| 图表 | ECharts 5 |
| 工具 | VueUse |
| 测试 | Vitest + Playwright（E2E） |

---

## 目录结构

```text
saas-multi-tenant-admin/
├── apps/
│   ├── portal/                  # SaaS 管理门户（端口 5173）
│   └── task-system/             # Demo：任务管理子系统（端口 5174）
├── packages/
│   ├── shared/                  # 公共类型、常量、工具函数、权限模型
│   ├── api-client/              # Alova 请求实例及通用请求能力
│   ├── mock/                    # MockJS 数据、接口及处理器
│   ├── ui/                      # 可复用业务组件（PageHeader、StatusTag、Permission 等）
│   ├── layouts/                 # 通用布局（AppLayout、SidebarNav、TopNavBar、Breadcrumb）
│   └── config/                  # 公共 Tailwind 等配置
├── e2e/                         # Playwright 端到端测试
├── scripts/                     # 辅助脚本（如 SPA 静态服务器）
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
└── README.md
```

### 依赖关系（单向，无循环）

```text
apps/portal ──────────┐
apps/task-system ─────┼──► packages/ui ──────┐
                      │                      ├──► packages/shared
                      ├──► packages/layouts ──┤
                      │                      └──► packages/api-client
                      ├──► packages/mock ─────┘
                      └──► packages/api-client
```

- `shared` 无任何内部依赖，是全系统类型与工具的基础。
- `api-client` 只依赖 `shared`，提供 Alova 实例工厂与拦截器。
- `mock` 依赖 `shared` 与 Alova，提供数据仓库与接口处理器。
- `ui` / `layouts` 依赖 `shared`（以及 Vue/Element Plus）。
- 应用层组装一切，公共包**不反向依赖**任何业务子系统。

---

## 快速开始

### 环境要求

- Node.js ≥ 18
- pnpm ≥ 9

### 安装依赖

```bash
pnpm install
```

### 启动开发

```bash
# 同时启动门户和任务子系统
pnpm dev

# 或分别启动
pnpm dev:portal   # 门户 → http://localhost:5173
pnpm dev:task     # 任务子系统 → http://localhost:5174
```

### 构建

```bash
pnpm build          # 构建所有应用
pnpm build:portal
pnpm build:task
```

### 类型检查 / 代码检查 / 测试

```bash
pnpm typecheck      # 全量 TypeScript 类型检查
pnpm lint:check     # ESLint 检查
pnpm test           # Vitest 运行测试
```

### 端到端测试（Playwright）

```bash
# 需先安装 @playwright/test 及浏览器（见 e2e/ 目录）
node node_modules/@playwright/test/cli.js test
```

---

## 演示账号

| 账号 | 密码 | 角色 | 权限说明 |
| --- | --- | --- | --- |
| `admin` | `admin123` | 平台管理员 | 拥有全部权限（`*`），可管理租户、子系统、用户、角色、菜单 |
| `tenant_admin` | `tenant123` | 租户管理员 | 管理租户内资源与任务 |
| `member` | `member123` | 普通成员 | 仅可访问任务相关功能 |

> 登录页也提供了快捷填充演示账号的入口。

### SSO 单点登录（前端模拟）

登录页提供「企业 SSO 单点登录」入口，支持以下**模拟身份提供商**（全部前端 Mock 数据，非真实 IdP）：

| 提供商 | 编码 | 状态 | 说明 |
| --- | --- | --- | --- |
| 企业统一认证 (OIDC) | `oidc` | 启用 | 默认提供商 |
| 企业微信 | `wecom` | 启用 | 模拟扫码/工作台免密登录 |
| 飞书 | `feishu` | 启用 | 模拟飞书账号免密登录 |
| 钉钉 | `dingtalk` | 停用 | 演示停用状态 |
| LDAP 目录服务 | `ldap` | 停用 | 演示停用状态 |

SSO 流程（模拟）：

1. 登录页点击「企业 SSO 单点登录」→ 进入 `/sso/login` 选择提供商；
2. 发起授权（`/sso/authorize` 返回 state 与授权地址）；
3. 模拟跳转 IdP 授权后回调 `/sso/callback`，携带 `code` 换取 token 与用户信息；
4. **首次 SSO 登录自动创建账号**（默认授予「租户成员」角色），已有账号则直接登录。

> SSO 相关 Mock 接口位于 `packages/mock/src/modules/sso.ts`，授权码、state 校验均为演示逻辑，未来可平滑替换为真实 OAuth 2.0 / OIDC / 企业统一身份认证。

---

## 核心特性

- **多租户隔离**：租户、子系统、用户、角色、菜单的完整 RBAC 模型。
- **菜单驱动**：目录（dir）/ 菜单（menu）/ 按钮（button）三级菜单作为一等实体，统一驱动动态路由与侧边栏。
- **动态路由**：菜单 `component` 字段经 `import.meta.glob` 自动映射为路由组件，`router.addRoute` 动态注册。
- **子系统级权限**：角色权限按子系统分组，新增子系统自动生成默认菜单与权限。
- **深浅主题**：全局深浅色切换，持久化到 `localStorage`。
- **跨应用单点登录**：portal 与 task-system 跨端口共享登录态（URL 携带 token 导入）。

---

## 核心架构

### 统一数据请求链路

```text
Vue 页面
   ↓
业务 Composable / Store
   ↓
业务 API 模块（apps/*/src/api）
   ↓
统一 Alova 实例（packages/api-client）
   ↓
MockJS 接口处理器（packages/mock）
   ↓
Mock 数据仓库（内存数据库）
   ↓
标准响应结构 { code, message, data }
```

关键约定：

1. **所有**业务数据（列表、详情、统计、日志、配置）均通过 Alova 请求获取，页面组件**不硬编码**业务数据、**不调用** `setTimeout` 模拟请求。
2. Alova 请求层统一处理：请求拦截（注入 token）、响应拦截（解包标准响应、抛出业务错误）、加载状态、错误处理。
3. 本模板为纯前端演示，**始终注入 Mock 适配器**（`createMockAdapter(true)`）。切换真实后端时，只需替换 `apps/*/src/api/client.ts` 中的请求适配器，**无需改动页面组件**。

### 权限模型（RBAC）

- 权限数据通过 Mock 接口获取，权限判断统一走 `packages/shared` 的 `hasPermission` / `hasRole` 工具。
- 区分**平台级权限**（`platform:*`）与**租户级权限**（如 `task:*`）。
- 按钮级权限通过 `@saas/ui` 的 `<Permission>` 组件 + `provide/inject` 注入的用户权限判断。
- 路由访问控制在 `router.beforeEach` 中根据 `meta.code` 校验。
- **子系统级权限**：角色权限按子系统分组，每个子系统独立配置菜单/按钮权限，运行时聚合为扁平权限码。

> ⚠️ **安全说明**：前端权限控制仅用于演示与提升体验，**不是真正的安全边界**。真实的租户隔离与授权必须由后端执行。

### 菜单与动态路由

菜单是系统的核心数据，采用「目录 → 菜单 → 按钮」三级模型（对齐主流开源方案如 ruoyi-vue-pro）：

- **数据模型**（`packages/shared/src/types/auth.ts` 的 `MenuItem`）：`id` / `code` / `name` / `type(dir|menu|button)` / `parentId` / `path` / `component` / `icon` / `sort` / `visible` / `status` / `subsystemCode`。
- **唯一数据源**：`packages/mock/src/db` 的 `menus` 表，门户与各子系统的菜单种子数据在 `packages/shared/src/constants/permission.ts`。
- **菜单管理模块**：门户「系统管理 → 菜单管理」提供树形表格 + 增删改，按子系统筛选。
- **动态侧边栏**：`SidebarNav` 从 `menuApi.tree()` 拉取菜单树（过滤按钮节点、按权限过滤），`el-menu` + `el-sub-menu` 渲染，父菜单可展开折叠。
- **动态路由**：`router/componentMap.ts` 用 `import.meta.glob` 自动映射组件，`router/dynamic.ts` 用 `router.addRoute` 注册。
- **菜单变更联动**：菜单增删改后通过 `window.dispatchEvent(new CustomEvent('menu:changed'))` 通知布局重新加载侧边栏。

### Mock 数据架构

- `packages/mock/src/db` 提供**内存数据库**，所有领域接口读写同一份数据，保证统计数字与列表数据一致。
- 按领域划分 Mock 接口：`auth` / `sso` / `tenant` / `subsystem` / `user` / `role` / `menu` / `task` / `dashboard`。
- Mock 处理器内置业务规则校验（如：仅失败任务可重试、已完成任务不可取消、任务编码唯一性等）。
- 第三方系统凭证字段仅使用**脱敏**演示数据（`sk_****_demo`）。

---

## 功能清单

### 门户（portal）

- ✅ 登录/退出、路由守卫、权限控制
- ✅ SSO 单点登录（企业微信 / 飞书 / OIDC 等模拟提供商）
- ✅ 整体布局：可折叠侧边栏、顶栏、面包屑、用户菜单、通知、租户切换
- ✅ 深浅主题切换
- ✅ 租户管理（列表/详情/增删改/启停/搜索/筛选/分页）
- ✅ 子系统管理（列表/增删改/启停/授权关系/进入应用/动态路由）
- ✅ 用户、角色与权限管理（RBAC，子系统级权限分组配置）
- ✅ 菜单管理（目录/菜单/按钮三级，驱动动态路由与侧边栏）
- ✅ 门户仪表盘（统计 + 图表）

### 任务管理子系统（task-system）

- ✅ 任务看板（统计 + 趋势 + 分布 + 筛选）
- ✅ 任务管理（列表/详情/创建/编辑/触发/取消/重试/删除/批量操作/多维筛选/排序/分页）
- ✅ 任务详情（基本信息/配置/日志/历史/重试记录）
- ✅ 第三方系统管理
- ✅ 任务类型与规则配置
- ✅ 系统基础设置（含可展开折叠的侧边栏父菜单）

---

## 扩展预留

- **认证**：登录流程经过统一 API 层，未来可平滑接入 OAuth 2.0 / OIDC / 企业统一身份认证（替换 `authApi` 与 auth store 即可）。
- **权限扩展**：菜单模型对齐主流中大型平台（目录/菜单/按钮 + 子系统分组），新增子系统自动初始化默认菜单，权限树可无限扩展。
- **真实后端**：Mock 与真实后端共用同一套业务 API 接口与 TypeScript 类型，替换请求适配器即可切换。

---

## 已知限制

- Mock 数据存储在内存中，**刷新页面后重置**（用于演示）。
- 演示认证**不是**生产级安全认证，请勿用于生产。
- 前端租户过滤仅为演示，真实隔离由后端执行。

---

## License

MIT
