# 租户领域 API 业务文档

> 源文件：`packages/mock/src/modules/tenant.ts`。类型来源：`packages/shared/src/types/tenant.ts`、`types/auth.ts`。

## 概述

租户领域负责租户的增删改查与「一键开通」。核心业务是：创建租户时原子性地联动创建租户管理员角色与租户管理员用户。涉及实体：`Tenant`、`Role`、`UserInfo`、`credentials`。

## 接口清单

| 方法 | 路径 | 职责 | 关联实体 |
| --- | --- | --- | --- |
| GET | `/tenant/list` | 租户分页列表（搜索+筛选+隔离） | Tenant、User |
| GET | `/tenant/{id}` | 租户详情 | Tenant |
| POST | `/tenant/create` | 创建租户（一键开通） | Tenant、Role、User、credentials |
| PUT | `/tenant/update` | 更新租户 | Tenant |
| POST | `/tenant/toggle-status` | 启用/停用租户 | Tenant |
| DELETE | `/tenant/{id}` | 删除租户 | Tenant |

## 通用约定

- 列表默认按 `createdAt` 倒序。
- 分页默认 `page=1`、`pageSize=10`，`total` 为过滤后总数。
- 租户级用户列表隔离仅返回本租户。

## 接口明细

### [GET] /tenant/list —— 租户分页列表

- **触发场景 / 业务目的**：租户管理页展示租户列表，支持关键词搜索、状态筛选、权限域数据隔离。
- **请求参数**：

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| keyword | string | 否 | '' | 关键词，匹配 name / code / contact（大小写不敏感） |
| status | string | 否 | '' | 状态筛选，空则不过滤 |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 10 | 每页条数 |
| userId | string | 否 | - | 当前用户 id，用于隔离 |

- **业务处理流程**：
  1. 取全部租户，按 `createdAt` 倒序。
  2. 若传 `userId` 且该用户 `scope === 'tenant'`，过滤为 `tenantId === user.tenantId`。
  3. 关键词过滤（name/code 大小写不敏感包含，contact 精确包含）。
  4. 状态过滤。
  5. 分页切片，返回 `{ list, total, page, pageSize }`。
- **校验与错误分支**：无（查询接口不抛业务错误）。
- **副作用 / 联动数据变更**：无。
- **响应结构**：`ApiResponse<PageResult<Tenant>>`。
- **权限与数据隔离**：租户级用户仅见本租户；平台级（或未传 userId）见全部。

### [GET] /tenant/{id} —— 租户详情

- **触发场景 / 业务目的**：查看单个租户详情。
- **请求参数**：`id`（路径参数）。
- **业务处理流程**：按 `id` 查找，不存在 → 404「租户不存在」。
- **校验与错误分支**：`404 租户不存在`。
- **副作用 / 联动数据变更**：无。
- **响应结构**：`ApiResponse<Tenant>`。
- **权限与数据隔离**：无（详情按 id 直查）。

### [POST] /tenant/create —— 创建租户（一键开通）

- **触发场景 / 业务目的**：平台管理员创建租户，一次性完成租户、管理员角色、管理员用户的开通。
- **请求参数**：

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| name | string | 是 | - | 租户名称 |
| code | string | 是 | - | 唯一标识 |
| status | string | 否 | active | 租户状态 |
| contact | string | 否 | '' | 联系人 |
| email | string | 否 | '' | 邮箱 |
| subsystemIds | string[] | 否 | [] | 已开通子系统 id 列表（表单勾选） |
| adminUsername | string | 否 | `{code}-admin` | 管理员用户名 |
| adminPassword | string | 否 | admin123 | 管理员密码 |
| expiredAt | string | 否 | +365 天 | 到期时间 |

- **业务处理流程**（4 步联动，缺一不可）：
  1. **校验**：`name`/`code` 不能为空 → 422「租户名称和唯一标识不能为空」；`code` 已存在 → 422「唯一标识已存在」。
  2. **建租户**：生成 `tenant-` 前缀 id，`userCount=0`，写入租户表。
  3. **建角色**：生成 `tenant_admin` 角色（`scope=tenant`、`tenantId=新租户id`），权限 = 已选子系统的全部菜单码/按钮码 + portal 的 `dashboard` 通用菜单（经 `buildTenantAdminPermissions`）。
  4. **建管理员用户**：`username = adminUsername || '{code}-admin'`，密码 `adminPassword || 'admin123'`；若用户名已存在 → 422「管理员用户名已存在」；用户权限 = 角色 `menuCodes ∪ permissionCodes` 并集；`tenantId=新租户id`、`isPlatformAdmin=false`；同时登记 `credentials[username]=password`。
  5. **回写**：`tenant.userCount = 1`。
- **校验与错误分支**：

| 条件 | code | message |
| --- | --- | --- |
| name 或 code 为空 | 422 | 租户名称和唯一标识不能为空 |
| code 已存在 | 422 | 唯一标识已存在 |
| 管理员用户名已存在 | 422 | 管理员用户名「{username}」已存在 |

- **副作用 / 联动数据变更**：新增 Tenant、新增 Role、新增 UserInfo、写入 credentials。
- **响应结构**：`ApiResponse<Tenant>`，message「创建成功，租户管理员账号：{username} / {password}」。
- **权限与数据隔离**：无（创建为平台级操作）。

### [PUT] /tenant/update —— 更新租户

- **触发场景 / 业务目的**：编辑租户基础信息。
- **请求参数**：`id`（必填）+ `Partial<Tenant>` 可更新字段。
- **业务处理流程**：
  1. 按 `id` 查找，不存在 → 404「租户不存在」。
  2. 若更新 `code` 且与其它租户重复 → 422「唯一标识已存在」。
  3. 合并字段，保留 `id`。
- **校验与错误分支**：`404 租户不存在`；`422 唯一标识已存在`。
- **副作用 / 联动数据变更**：更新租户记录。
- **响应结构**：`ApiResponse<Tenant>`，message「更新成功」。
- **权限与数据隔离**：无。

### [POST] /tenant/toggle-status —— 启用/停用租户

- **触发场景 / 业务目的**：切换租户 active/disabled 状态。
- **请求参数**：`{ id, status }`，`status` 取值 `active` | `disabled`。
- **业务处理流程**：按 `id` 查找，不存在 → 404「租户不存在」；否则更新 `status`。
- **校验与错误分支**：`404 租户不存在`。
- **副作用 / 联动数据变更**：更新租户状态。
- **响应结构**：`ApiResponse<Tenant>`，message「已启用」/「已停用」。
- **权限与数据隔离**：无。

### [DELETE] /tenant/{id} —— 删除租户

- **触发场景 / 业务目的**：删除租户。
- **请求参数**：`id`（路径参数）。
- **业务处理流程**：按 `id` 查找，不存在 → 404「租户不存在」；否则删除。
- **校验与错误分支**：`404 租户不存在`。
- **副作用 / 联动数据变更**：仅删除租户本身（Mock 未级联删除其角色/用户，后端需明确此边界）。
- **响应结构**：`ApiResponse<Tenant>`，message「删除成功」。
- **权限与数据隔离**：无。

## 业务规则汇总

- **一键开通原子性**：`tenant/create` 必须同时完成「建租户 + 建 tenant_admin 角色 + 建管理员用户 + 登记凭据 + 回写 userCount=1」，任一步失败整体失败。
- **租户管理员角色权限来源**：`buildTenantAdminPermissions(subsystemIds)` —— portal 仅授予 `scope=common` 的通用菜单（dashboard + 用户/角色管理），每个已开通子系统授予其全部菜单码/按钮码。
- **唯一性约束**：`tenant.code` 全局唯一。

## 关键边界与陷阱

- `delete` 接口**不级联**删除关联的角色/用户（Mock 现状），后端若需级联应显式实现并在此文档更新。
- `update` 的唯一性校验须排除自身（`t.id !== body.id`）。
- 管理员用户密码默认 `admin123`，用户名默认 `{code}-admin`。
