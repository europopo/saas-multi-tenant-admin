# 子系统领域 API 业务文档

> 源文件：`packages/mock/src/modules/subsystem.ts`。类型来源：`packages/shared/src/types/tenant.ts`（`Subsystem`）、`types/auth.ts`。

## 概述

子系统领域负责子系统的增删改查与启停，核心业务是：创建子系统时联动初始化其默认菜单（写入 `db.menus`）。列表接口按当前用户角色做可见性隔离。

## 接口清单

| 方法 | 路径 | 职责 | 关联实体 |
| --- | --- | --- | --- |
| GET | `/subsystem/list` | 子系统列表（按角色可见性过滤） | Subsystem、User、Role |
| GET | `/subsystem/{id}` | 子系统详情 | Subsystem |
| POST | `/subsystem/create` | 创建子系统（联动初始化菜单） | Subsystem、MenuItem |
| PUT | `/subsystem/update` | 更新子系统 | Subsystem |
| POST | `/subsystem/toggle-status` | 启停子系统 | Subsystem |

## 通用约定

- 列表按当前用户 `scope` 与 `accessibleSubsystems` 过滤可见性。
- 门户（`code === 'portal'`）始终对租户级用户可见。

## 接口明细

### [GET] /subsystem/list —— 子系统列表

- **触发场景 / 业务目的**：展示子系统列表，按当前用户角色过滤可见子系统。
- **请求参数**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | 否 | 当前用户 id，用于可见性过滤 |

- **业务处理流程**：
  1. 未传 `userId` 或用户不存在 → 返回全部子系统。
  2. 用户 `scope === 'platform'` → 返回全部。
  3. 否则：`allowed = accessibleSubsystems`，返回 `code === 'portal'` 或 `allowed.has(code)` 的子系统。
- **校验与错误分支**：无。
- **副作用 / 联动数据变更**：无。
- **响应结构**：`ApiResponse<Subsystem[]>`。
- **权限与数据隔离**：租户级用户仅见「门户 + 已授权子系统」，平台级见全部。

### [GET] /subsystem/{id} —— 子系统详情

- **业务处理流程**：按 `id` 查找，不存在 → 404「子系统不存在」。
- **校验与错误分支**：`404 子系统不存在`。
- **响应结构**：`ApiResponse<Subsystem>`。

### [POST] /subsystem/create —— 创建子系统

- **请求参数**：`Partial<Subsystem>`，`name`/`code` 必填。
- **业务处理流程**：
  1. `name`/`code` 为空 → 422「子系统名称和编码不能为空」。
  2. `code` 已存在 → 422「编码已存在」。
  3. 生成 `sub-` 前缀 id，默认值：`description=''`、`icon='Grid'`、`entryUrl='/'`、`status='active'`。
  4. **联动**：若 `db.menus` 中无该 `subsystemCode` 的菜单，则用 `buildSubsystemMenuSeed(code, name)` 初始化默认菜单。
- **校验与错误分支**：`422 子系统名称和编码不能为空`；`422 编码已存在`。
- **副作用 / 联动数据变更**：新增 Subsystem + 初始化 MenuItem。
- **响应结构**：`ApiResponse<Subsystem>`，message「创建成功」。

### [PUT] /subsystem/update —— 更新子系统

- **业务处理流程**：按 `id` 查找，不存在 → 404「子系统不存在」；合并字段（保留 `id`）。
- **校验与错误分支**：`404 子系统不存在`。
- **响应结构**：`ApiResponse<Subsystem>`，message「更新成功」。

### [POST] /subsystem/toggle-status —— 启停子系统

- **请求参数**：`{ id, status }`，`status` 取值 `active` | `disabled`。
- **业务处理流程**：按 `id` 查找，不存在 → 404「子系统不存在」；更新 `status`。
- **校验与错误分支**：`404 子系统不存在`。
- **响应结构**：`ApiResponse<Subsystem>`，message「已启用」/「已停用」。

## 业务规则汇总

- **可见性隔离**：租户级用户可见 = 门户 + 角色授权的子系统编码并集；平台级见全部。
- **创建联动**：新建子系统自动生成默认菜单模板（目录/菜单/按钮，编码 `{code}:dashboard`、`{code}:list`、`{code}:create`、`{code}:edit`、`{code}:delete`）。
- **唯一性约束**：`subsystem.code` 全局唯一。

## 关键边界与陷阱

- `code === 'portal'` 是特殊值，代表门户自身，租户级用户始终可见，后端实现勿遗漏。
- 菜单初始化以「该 `subsystemCode` 是否已有菜单」为幂等判断，避免重复初始化。
