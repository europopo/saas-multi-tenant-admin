# SaaS 多租户平台 API 业务文档

> 本文档是后端开发的**唯一业务规格来源**。它以 `packages/mock/src/modules/` 下的 Mock 接口为基准，逐接口提炼业务规则、边界与约束，供后端开发时 AI/开发者据此生成与 Mock 行为**完全一致**的后端业务逻辑代码。

## 目录结构

| 模块 | 文档 | 覆盖领域 | Mock 源文件 |
| --- | --- | --- | --- |
| 认证 | [auth.md](./auth.md) | 登录 / 退出 / 当前用户 | `packages/mock/src/modules/auth.ts` |
| 租户 | [tenant.md](./tenant.md) | 租户 CRUD / 一键开通 | `packages/mock/src/modules/tenant.ts` |
| 子系统 | [subsystem.md](./subsystem.md) | 子系统 CRUD / 可见性隔离 | `packages/mock/src/modules/subsystem.ts` |
| 用户与角色 | [user.md](./user.md) | 用户 / 角色 CRUD / 租户隔离 | `packages/mock/src/modules/user.ts` |
| 菜单 | [menu.md](./menu.md) | 菜单 CRUD / 树 / 角色授权 | `packages/mock/src/modules/menu.ts` |
| 数据字典 | [dict.md](./dict.md) | 字典类型 / 字典数据 CRUD / 租户隔离 | `packages/mock/src/modules/dict.ts` |
| 站内信 | [message.md](./message.md) | 通知发送 / 已读管理 / 目标范围 | `packages/mock/src/modules/message.ts` |
| 任务 | [task.md](./task.md) | 任务 CRUD / 状态机 / 第三方系统 / 类型规则 / 设置 | `packages/mock/src/modules/task.ts` |
| 门户仪表盘 | [dashboard.md](./dashboard.md) | 门户统计 | `packages/mock/src/modules/dashboard.ts` |
| SSO 单点登录 | [sso.md](./sso.md) | SSO 授权 / 回调 / 绑定 | `packages/mock/src/modules/sso.ts` |
| 通用约定 | [common.md](./common.md) | 响应结构 / 错误码 / 分页 / 类型来源 | `packages/shared/src/` |

## 阅读顺序建议

1. 先读 [common.md](./common.md)，掌握统一响应结构、错误码、分页与数据隔离的总纲；
2. 再按领域读对应模块文档；
3. 涉及跨领域联动时（如「创建租户 → 自动建角色/用户」「创建子系统 → 初始化菜单」），文档内已用「联动」标注，可交叉查阅。

## 关键概念速览

- **权限域（scope）**：`platform`（平台级）与 `tenant`（租户级），由用户角色聚合而来，决定数据行级隔离与菜单/子系统可见性。
- **数据隔离**：租户级用户调用列表类接口时，后端必须按 `tenantId` 过滤，仅返回本租户数据。
- **菜单唯一数据源**：`db.menus`（对应 ruoyi-vue-pro 的 `system_menu`），驱动角色授权、动态路由与侧边栏渲染。
- **多实体联动**：多个写接口存在「一次请求、多实体变更」的原子性业务规则，后端实现时需保持一致（详见各模块「业务规则汇总」）。
