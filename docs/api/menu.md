# 菜单领域 API 业务文档

> 源文件：`packages/mock/src/modules/menu.ts`。类型来源：`packages/shared/src/types/auth.ts`（`MenuItem`）、`constants/permission.ts`。

## 概述

菜单是**唯一数据源**，驱动角色授权、动态路由与侧边栏渲染。本领域负责菜单的增删改查、树组装、角色授权用树、以及子系统菜单初始化。涉及实体：`MenuItem`、`Subsystem`。

## 接口清单

| 方法 | 路径 | 职责 | 关联实体 |
| --- | --- | --- | --- |
| GET | `/menu/list` | 菜单列表（筛选+排序） | MenuItem |
| GET | `/menu/tree` | 菜单树（按 parentId 组装） | MenuItem |
| GET | `/menu/for-role` | 角色授权用菜单树（按子系统分组） | MenuItem、Subsystem |
| GET | `/menu/{id}` | 菜单详情 | MenuItem |
| POST | `/menu/create` | 创建菜单 | MenuItem |
| PUT | `/menu/update` | 更新菜单 | MenuItem |
| DELETE | `/menu/{id}` | 删除菜单（级联删除子孙） | MenuItem |
| POST | `/menu/init-subsystem` | 初始化子系统菜单 | MenuItem |

## 通用约定

- 菜单按 `sort` 升序排序。
- 树结构由 `buildMenuTree`（`packages/shared/src/constants/permission.ts`）按 `parentId` 组装，根节点 `parentId=null`。

## 接口明细

### [GET] /menu/list —— 菜单列表

- **请求参数**（`SysMenuQuery`）：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| subsystemCode | string | 否 | 子系统编码筛选 |
| status | string | 否 | 状态筛选 |
| name | string | 否 | 名称模糊匹配 |
| code | string | 否 | 编码模糊匹配 |
| visibleOnly | boolean | 否 | 仅返回 `visible=true` |

- **业务处理流程**：按 subsystemCode → status → name → code → visibleOnly 依次过滤，按 `sort` 升序。
- **响应结构**：`ApiResponse<MenuItem[]>`。

### [GET] /menu/tree —— 菜单树

- **请求参数**：`subsystemCode`、`visibleOnly`（可选）。
- **业务处理流程**：过滤后经 `buildMenuTree` 组装为树。
- **响应结构**：`ApiResponse<MenuItem[]>`（树形，含 `children`）。

### [GET] /menu/for-role —— 角色授权用菜单树

- **业务目的**：为角色权限配置面板提供「目录/菜单/按钮」三级树，按子系统分组。
- **业务处理流程**：
  1. 门户分组：`subsystemCode === 'portal'` 的菜单组装为树。
  2. 其余每个 `subsystemCode`（去重、排除 portal）一组，组名/图标取对应子系统。
- **响应结构**：`ApiResponse<PermissionGroup[]>`，每组 `{ subsystemCode, name, icon, menus }`。

### [GET] /menu/{id} —— 菜单详情

- **业务处理流程**：不存在 → 404「菜单不存在」。
- **响应结构**：`ApiResponse<MenuItem>`。

### [POST] /menu/create —— 创建菜单

- **请求参数**：`Partial<MenuItem>`，`name`/`code` 必填。
- **业务处理流程**：
  1. `name`/`code` 为空 → 422「菜单名称和编码不能为空」。
  2. 同 `subsystemCode` 下 `code` 已存在 → 422「同子系统下编码已存在」。
  3. 默认值：`type='menu'`、`parentId=null`、`path=''`、`component=''`、`icon=''`、`sort=99`、`visible=true`、`status='active'`、`subsystemCode='portal'`、`scope='common'`、`keepAlive=false`。
- **校验与错误分支**：`422 菜单名称和编码不能为空`；`422 同子系统下编码已存在`。
- **响应结构**：`ApiResponse<MenuItem>`，message「创建成功」。

### [PUT] /menu/update —— 更新菜单

- **业务处理流程**：不存在 → 404「菜单不存在」；合并字段（保留 `id`）。
- **响应结构**：`ApiResponse<MenuItem>`，message「更新成功」。

### [DELETE] /menu/{id} —— 删除菜单（级联删除子孙）

- **业务处理流程**：
  1. 不存在 → 404「菜单不存在」。
  2. 收集所有待删除 id：从目标节点出发，递归收集所有 `parentId` 命中已收集集合的子节点。
  3. 删除全部命中节点。
- **副作用 / 联动数据变更**：删除菜单及其**全部子孙节点**。
- **响应结构**：`ApiResponse<null>`，message「已删除 {n} 条菜单」。

### [POST] /menu/init-subsystem —— 初始化子系统菜单

- **业务目的**：为子系统创建后初始化菜单（供子系统 create 联动调用，也提供独立入口）。
- **请求参数**：`{ subsystemCode, subsystemName }`。
- **业务处理流程**：
  1. 该 `subsystemCode` 已有菜单 → 返回「菜单已存在」（幂等，不重复初始化）。
  2. 否则用 `buildSubsystemMenuSeed` 生成默认菜单。
- **响应结构**：`ApiResponse<null>`，message「菜单已存在」/「已初始化子系统菜单」。

## 业务规则汇总

- **唯一性约束**：`code` 在**同 `subsystemCode` 内**唯一（跨子系统可重复）。
- **级联删除**：删除菜单必须级联删除所有子孙节点。
- **默认菜单模板**（`buildSubsystemMenuSeed`）：`{code}:dashboard`、`{code}:list`、`{code}:create`、`{code}:edit`、`{code}:delete`，均 `scope=common`。
- **菜单权限域 `scope`**：`platform`（平台级菜单）/ `tenant` / `common`（通用菜单），决定角色授权与可见性。

## 关键边界与陷阱

- `/menu/for-role` 已替代旧的 `/subsystem/menus`，后端勿再保留旧接口。
- 菜单 `code` 唯一性作用域是「子系统内」，而非全局。
- `delete` 的级联是**递归收集**子孙，需正确处理深层嵌套。
