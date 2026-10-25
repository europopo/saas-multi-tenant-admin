# 通用约定 API 业务文档

> 所有领域接口共用的响应结构、错误码、分页与数据隔离规则。后端实现所有接口时必须遵守本文件约定。

## 概述

后端所有接口统一返回 `ApiResponse<T>` 结构，业务状态通过 `code` 字段表达（HTTP 层在 Mock 中统一为 200，真实后端建议同步返回语义化 HTTP 状态码）。数据层以内存数组模拟数据库，后端可映射为关系型表，但**业务规则、校验顺序、隔离逻辑必须与本文档保持一致**。

## 统一响应结构

来源：`packages/shared/src/types/common.ts` 的 `ApiResponse<T>`，`packages/shared/src/constants/business.ts` 的 `RESPONSE`。

```ts
interface ApiResponse<T> {
  code: number;      // 业务状态码，0 表示成功
  message: string;   // 提示信息
  data: T;           // 业务数据
  traceId?: string;  // 请求追踪 id（排障用）
}
```

成功：`{ code: 0, message: 'ok' 或具体提示, data }`
失败：`{ code: 非0, message: 错误文案, data: null }`

## 错误码（BUSINESS_CODE）

来源：`packages/shared/src/constants/business.ts`。

| 常量 | 值 | 语义 | 典型触发 |
| --- | --- | --- | --- |
| `SUCCESS` | 0 | 成功 | 正常返回 |
| `UNAUTHORIZED` | 401 | 未认证 / 凭证无效 | 登录失败、token 失效、SSO state/授权码校验失败 |
| `FORBIDDEN` | 403 | 无权限 / 禁止操作 | 账号停用、任务不允许手动触发/取消 |
| `NOT_FOUND` | 404 | 资源不存在 | 按 id 查无实体 |
| `VALIDATION_ERROR` | 422 | 参数校验失败 / 状态不允许 | 必填缺失、唯一性冲突、状态机不允许 |
| `SERVER_ERROR` | 500 | 服务器错误（兜底） | 未显式指定的错误 |

## 分页约定

来源：`packages/shared/src/types/common.ts` 的 `PageQuery` / `PageResult`。

- 请求：`page`（默认 1）、`pageSize`（默认 10）。
- 响应：`{ list, total, page, pageSize }`，其中 `total` 为**过滤后的总数**（用于前端分页器）。
- 分页在**完成所有筛选/隔离之后**进行（见 `paginate` 工具，`packages/shared/src/utils/common.ts`）。

## 数据隔离总纲

- **权限域 scope**：`platform` / `tenant`（来源 `types/auth.ts` 的 `RoleScope`）。
- 判断规则：用户任一角色 `scope === 'platform'` 即视为平台级，否则租户级。
- **平台级用户**：列表类接口返回全部数据（全量）。
- **租户级用户**：列表类接口必须按 `tenantId` 过滤，仅返回本租户数据；角色列表还须**排除平台级角色**。
- 派生字段 `scope`、`accessibleSubsystems` 为运行时聚合值（见 `packages/mock/src/db/index.ts` 的 `resolveUserAuth`），后端须等价实现：登录、用户列表、角色变更后三处结果一致。

## ID 生成规则

来源：`packages/shared/src/utils/common.ts` 的 `generateId`。

- 格式：`{prefix}{时间戳36进制}{8位随机字符}`，保证唯一性。
- 各实体前缀：`tenant-`、`sub-`、`user-`、`role-`、`menu-`、`task-`、`ts-`（第三方系统）、`log-`（日志）、`hist-`（状态历史）、`retry-`（重试）、`act-`（活动）、`sso-state-`。
- 后端可用数据库自增/雪花算法替代，但需保证唯一。

## 类型来源索引

| 类型文件 | 主要类型 |
| --- | --- |
| `packages/shared/src/types/common.ts` | `ApiResponse`、`PageQuery`、`PageResult`、`SortQuery`、`DictItem`、`Id` |
| `packages/shared/src/types/auth.ts` | `UserInfo`、`Role`、`MenuItem`、`SsoProvider`、`SubsystemPermission`、`PermissionGroup`、各枚举 |
| `packages/shared/src/types/tenant.ts` | `Tenant`、`Subsystem`、`TenantQuery` |
| `packages/shared/src/types/task.ts` | `Task`、`TaskConfig`、`TaskLog`、`TaskStatusHistory`、`TaskRetryRecord`、`TaskTypeRule`、`ThirdSystem`、`SystemSettings`、`DashboardData` |
| `packages/shared/src/types/dashboard.ts` | `PortalDashboardData`、`ActivityRecord` 等 |

## 关键枚举速查

| 枚举 | 取值 |
| --- | --- |
| `UserStatus` | `active` \| `disabled` |
| `TenantStatus` | `active` \| `disabled` \| `pending` |
| `RoleScope` | `platform` \| `tenant` |
| `MenuItemType` | `dir` \| `menu` \| `button` |
| `MenuScope` | `platform` \| `tenant` \| `common` |
| `TaskStatus` | `pending` \| `running` \| `success` \| `failed` \| `canceled` |
| `TaskPriority` | `low` \| `medium` \| `high` \| `urgent` |
| `TaskType` | `data-sync` \| `report` \| `backup` \| `notify` \| `custom` |
| `RetryStrategy` | `none` \| `fixed` \| `exponential` |
| `ThirdSystemType` | `erp` \| `crm` \| `bi` \| `custom` |
| `SsoProviderType` | `oidc` \| `wecom` \| `feishu` \| `dingtalk` \| `ldap` |
