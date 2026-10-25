# 用户与角色领域 API 业务文档

> 源文件：`packages/mock/src/modules/user.ts`。类型来源：`packages/shared/src/types/auth.ts`。

## 概述

用户与角色领域负责用户、角色的增删改查与启停，核心业务是：用户权限 = 其角色「菜单码 ∪ 操作码」的并集，以及租户级数据隔离。涉及实体：`UserInfo`、`Role`。

## 接口清单

| 方法 | 路径 | 职责 | 关联实体 |
| --- | --- | --- | --- |
| GET | `/user/list` | 用户分页列表（搜索+筛选+隔离） | User、Role |
| GET | `/user/{id}` | 用户详情 | User、Role |
| POST | `/user/create` | 创建用户 | User、Role |
| PUT | `/user/update` | 更新用户 | User、Role |
| POST | `/user/toggle-status` | 用户启停 | User |
| DELETE | `/user/{id}` | 删除用户 | User |
| GET | `/role/list` | 角色列表（租户隔离） | Role、User |
| GET | `/role/{id}` | 角色详情 | Role |
| POST | `/role/create` | 创建角色 | Role |
| PUT | `/role/update` | 更新角色 | Role |
| DELETE | `/role/{id}` | 删除角色 | Role |

## 通用约定

- 用户信息统一经 `resolveUserAuth` 注入 `scope`、`accessibleSubsystems`。
- 用户权限模型：`permissions = Σ(role.menuCodes ∪ role.permissionCodes)`（去重）。
- 角色 `tenantId`：平台级恒为 `null`，租户级为所属租户 id。
- 用户 `tenantId`：平台管理员恒为 `null`（不属于任何租户），租户成员为所属租户 id；类型为 `string | null`。

## 接口明细

### [GET] /user/list —— 用户分页列表

- **请求参数**：

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| keyword | string | 否 | '' | 匹配 username / nickname / email（大小写不敏感） |
| status | string | 否 | '' | 状态筛选 |
| userId | string | 否 | - | 当前用户 id，用于隔离 |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 10 | 每页条数 |

- **业务处理流程**：
  1. 取全部用户。
  2. 若当前用户 `scope === 'tenant'`，过滤为 `tenantId === current.tenantId`。
  3. 关键词/状态过滤。
  4. 分页，`list` 中每个用户经 `resolveUserAuth` 注入派生字段。
- **校验与错误分支**：无。
- **响应结构**：`ApiResponse<PageResult<UserInfo>>`。
- **权限与数据隔离**：租户级仅见本租户用户；平台级见全部。

### [GET] /user/{id} —— 用户详情

- **业务处理流程**：按 `id` 查找，不存在 → 404「用户不存在」；返回 `resolveUserAuth` 结果。
- **校验与错误分支**：`404 用户不存在`。
- **响应结构**：`ApiResponse<UserInfo>`。

### [POST] /user/create —— 创建用户

- **请求参数**：`Partial<UserInfo>`，`username`/`nickname` 必填。
- **业务处理流程**：
  1. `username`/`nickname` 为空 → 422「用户名和昵称不能为空」。
  2. `username` 已存在 → 422「用户名已存在」。
  3. 解析 `roleIds` → `roles`（角色 code 列表）；计算 `permissions`（菜单码∪操作码并集）。
  4. 默认值：`avatar=''`、`email=''`、`status='active'`、`tenantId='tenant-demo'`、`isPlatformAdmin = roles 含 'platform_admin'`。
- **校验与错误分支**：`422 用户名和昵称不能为空`；`422 用户名已存在`。
- **副作用 / 联动数据变更**：新增 User。
- **响应结构**：`ApiResponse<UserInfo>`（含派生字段），message「创建成功」。

### [PUT] /user/update —— 更新用户

- **业务处理流程**：
  1. 按 `id` 查找，不存在 → 404「用户不存在」。
  2. 若更新 `roleIds`，重算 `roles`、`permissions`、`isPlatformAdmin`；未传则沿用原 roleIds 重算（保持一致性）。
- **校验与错误分支**：`404 用户不存在`。
- **响应结构**：`ApiResponse<UserInfo>`，message「更新成功」。

### [POST] /user/toggle-status —— 用户启停

- **请求参数**：`{ id, status }`，`status` 取值 `active` | `disabled`。
- **业务处理流程**：不存在 → 404「用户不存在」；更新 `status`。
- **响应结构**：`ApiResponse<UserInfo>`，message「已启用」/「已停用」。

### [DELETE] /user/{id} —— 删除用户

- **业务处理流程**：不存在 → 404「用户不存在」；删除。
- **响应结构**：`ApiResponse<UserInfo>`，message「删除成功」。

### [GET] /role/list —— 角色列表

- **请求参数**：`userId`（可选，用于隔离）。
- **业务处理流程**：
  1. 未传 `userId` 或用户不存在 → 返回全部角色。
  2. 当前用户 `scope === 'tenant'` → 仅返回 `tenantId === user.tenantId` 的角色（**排除平台级角色**）。
  3. 平台级 → 返回全部。
- **响应结构**：`ApiResponse<Role[]>`。
- **权限与数据隔离**：租户级仅见本租户角色（不含平台级）。

### [GET] /role/{id} —— 角色详情

- **业务处理流程**：不存在 → 404「角色不存在」。
- **响应结构**：`ApiResponse<Role>`。

### [POST] /role/create —— 创建角色

- **请求参数**：`Partial<Role>`，`code`/`name` 必填。
- **业务处理流程**：
  1. `code`/`name` 为空 → 422「角色编码和名称不能为空」。
  2. `code` 已存在 → 422「角色编码已存在」。
  3. 默认值：`description=''`、`scope='tenant'`、`menuCodes=[]`、`permissionCodes=[]`、`subsystemPermissions=[]`、`status='active'`。
  4. `tenantId`：`scope === 'platform'` 时为 `null`，否则为传入 `tenantId ?? null`。
- **校验与错误分支**：`422 角色编码和名称不能为空`；`422 角色编码已存在`。
- **响应结构**：`ApiResponse<Role>`，message「创建成功」。

### [PUT] /role/update —— 更新角色

- **业务处理流程**：
  1. 不存在 → 404「角色不存在」。
  2. 合并字段；若提交 `subsystemPermissions` 则保留分组结构。
- **响应结构**：`ApiResponse<Role>`，message「更新成功」。

### [DELETE] /role/{id} —— 删除角色

- **业务处理流程**：不存在 → 404「角色不存在」；删除。
- **响应结构**：`ApiResponse<Role>`，message「删除成功」。

## 业务规则汇总

- **权限聚合**：用户 `permissions` = 所有角色 `menuCodes ∪ permissionCodes` 去重；`roles` = 角色 code 列表。
- **平台管理员判定**：`isPlatformAdmin = roles.includes('platform_admin')`。
- **角色 tenantId 规则**：`scope === 'platform'` ⇔ `tenantId === null`；`scope === 'tenant'` ⇔ `tenantId` 归属某租户。
- **角色列表隔离**：租户级用户不可见平台级角色。
- **唯一性约束**：`user.username`、`role.code` 唯一。

## 关键边界与陷阱

- 用户 `update` 即使不传 `roleIds`，也会基于原 `roleIds` 重算 `permissions`/`roles`/`isPlatformAdmin`，保证派生字段与角色实时一致。
- `role/list` 的隔离**不是**「返回本租户 + 平台级」，而是**仅本租户租户级角色**，后端勿误加平台级角色。
- 角色 `update` 与 `create` 对 `subsystemPermissions` 的处理不同：`create` 默认空数组，`update` 保留原值（若未传）。
