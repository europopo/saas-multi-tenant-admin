# 数据字典领域 API 业务文档

> 源文件：`packages/mock/src/modules/dict.ts`。类型来源：`packages/shared/src/types/dict.ts`。

## 概述

数据字典领域负责字典类型与字典数据的增删改查，核心业务是：**纯租户级隔离**（`tenantId` 必填），供各子系统业务下拉框按编码复用，替代硬编码枚举。系统内置固定枚举（如用户状态）走代码联合类型，不进字典表。涉及实体：`DictType`、`DictData`。

## 接口清单

| 方法 | 路径 | 职责 | 关联实体 |
| --- | --- | --- | --- |
| GET | `/dict/type/list` | 字典类型分页列表（隔离+筛选） | DictType |
| POST | `/dict/type/create` | 创建字典类型 | DictType |
| PUT | `/dict/type/update` | 更新字典类型 | DictType |
| DELETE | `/dict/type/{id}` | 删除字典类型（级联删数据） | DictType、DictData |
| GET | `/dict/data/list` | 按类型查字典数据 | DictData |
| GET | `/dict/data/by-type` | 按编码取字典项（业务下拉复用） | DictType、DictData |
| POST | `/dict/data/create` | 创建字典数据 | DictData |
| PUT | `/dict/data/update` | 更新字典数据 | DictData |
| DELETE | `/dict/data/{id}` | 删除字典数据 | DictData |

## 通用约定

- **纯租户级**：`DictType.tenantId`、`DictData.tenantId` 恒为具体租户 id（必填，无 `null`）。
- 隔离解析：`resolveTenantId(userId)` —— 未传 `userId` 返回 `null`（不限制）；平台级用户返回 `null`（可跨租户）；租户级返回其 `tenantId`。
- `DictData.value` 为英文编码存储值（永不翻译，参与逻辑判断）；`label` 为显示文案；`labelEn` 为多语言预留位（当前仅存储，不参与运行时切换）。

## 接口明细

### [GET] /dict/type/list —— 字典类型分页列表

- **请求参数**：

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| userId | string | 否 | - | 当前用户 id，用于租户隔离 |
| keyword | string | 否 | '' | 匹配 name / type（大小写不敏感） |
| status | string | 否 | '' | 状态筛选（active/disabled） |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 10 | 每页条数 |

- **业务处理流程**：
  1. 解析 `tenantId`（平台级不限，租户级按本租户过滤）。
  2. 关键字/状态过滤。
  3. 分页。
- **校验与错误分支**：无。
- **响应结构**：`ApiResponse<PageResult<DictType>>`。
- **权限与数据隔离**：租户级仅见本租户字典类型；平台级见全部。

### [POST] /dict/type/create —— 创建字典类型

- **请求参数**：`Partial<DictType>`，`name`/`type`/`tenantId` 必填。
- **业务处理流程**：
  1. `name`/`type` 为空 → 422「字典名称和编码不能为空」。
  2. `tenantId` 为空 → 422「字典必须归属某个租户」。
  3. 同租户下 `type` 已存在 → 422「同租户下字典编码已存在」。
  4. 默认值：`status='active'`、`remark=''`。
- **校验与错误分支**：`422 字典名称和编码不能为空`；`422 字典必须归属某个租户`；`422 同租户下字典编码已存在`。
- **响应结构**：`ApiResponse<DictType>`，message「创建成功」。

### [PUT] /dict/type/update —— 更新字典类型

- **业务处理流程**：不存在 → 404「字典类型不存在」；合并字段（`id` 不可变）。
- **校验与错误分支**：`404 字典类型不存在`。
- **响应结构**：`ApiResponse<DictType>`，message「更新成功」。

### [DELETE] /dict/type/{id} —— 删除字典类型

- **业务处理流程**：
  1. 不存在 → 404「字典类型不存在」。
  2. 统计并级联删除该类型下全部 `DictData`。
- **校验与错误分支**：`404 字典类型不存在`。
- **副作用 / 联动数据变更**：级联删除 `DictData`（`typeId === id` 的全部记录）。
- **响应结构**：`ApiResponse<null>`，message「已删除，同时删除 N 条字典数据」。

### [GET] /dict/data/list —— 按类型查字典数据

- **请求参数**：

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| typeId | string | 否 | - | 字典类型 id |
| userId | string | 否 | - | 当前用户 id，用于租户隔离 |

- **业务处理流程**：按 `typeId` 过滤；按租户隔离；按 `sort` 升序。
- **响应结构**：`ApiResponse<DictData[]>`。

### [GET] /dict/data/by-type —— 按编码取字典项

- **请求参数**：

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| type | string | 是 | - | 字典编码，如 `task_priority` |
| tenantId | string | 否 | - | 租户 id（可选过滤） |

- **业务处理流程**：
  1. `type` 缺失 → 422「缺少字典编码」。
  2. 按 `tenantId` 过滤（若有）。
  3. 按 `type` 找到 `DictType`，过滤其 `DictData`；仅返回 `status='active'`，按 `sort` 升序。
  4. 映射为 `DictItem[]`（`{ label, value, color }`）。
- **校验与错误分支**：`422 缺少字典编码`。
- **响应结构**：`ApiResponse<DictItem[]>`（供业务下拉框直接消费）。

### [POST] /dict/data/create —— 创建字典数据

- **请求参数**：`Partial<DictData>`，`typeId`/`label`/`value` 必填。
- **业务处理流程**：
  1. `typeId`/`label`/`value` 缺失 → 422「字典数据不完整」。
  2. `typeId` 对应类型不存在 → 404「字典类型不存在」。
  3. 默认值：`sort=99`、`status='active'`、`tenantId = 传入值 ?? 所属类型的 tenantId`。
- **校验与错误分支**：`422 字典数据不完整`；`404 字典类型不存在`。
- **响应结构**：`ApiResponse<DictData>`，message「创建成功」。

### [PUT] /dict/data/update —— 更新字典数据

- **业务处理流程**：不存在 → 404「字典数据不存在」；合并字段（`id` 不可变）。
- **响应结构**：`ApiResponse<DictData>`，message「更新成功」。

### [DELETE] /dict/data/{id} —— 删除字典数据

- **业务处理流程**：不存在 → 404「字典数据不存在」；删除。
- **响应结构**：`ApiResponse<DictData>`，message「删除成功」。

## 业务规则汇总

- **纯租户级**：字典类型与数据 `tenantId` 恒为具体租户 id，不存在 `null`（平台级）。
- **唯一性**：同租户内 `DictType.type` 唯一（跨租户可重名）。
- **级联删除**：删字典类型 → 连带删除其全部字典数据。
- **编码查询**：`by-type` 只返回 `status='active'` 的数据，并按 `sort` 升序；返回 `DictItem[]` 而非完整 `DictData[]`。
- **默认租户归属**：创建字典数据时若未传 `tenantId`，自动继承所属字典类型的 `tenantId`。

## 关键边界与陷阱

- 平台级用户（`scope='platform'`）调用 `type/list`、`data/list` 时**不限租户**（`resolveTenantId` 返回 `null`），可查看全部租户字典；租户级仅见本租户。
- `DictData.value` 必须用英文编码（如 `urgent`/`high`），**不要**用中文作为存储值，否则多语言切换与逻辑判断会出错。
- `labelEn` 是多语言**预留位**：当前只存储、不参与运行时切换；后端勿在未接多语言前就返回 `labelEn` 作为主显示。
- 删除字典类型是**不可逆的级联操作**，后端需在返回 message 中体现删除的数据条数（`已删除，同时删除 N 条字典数据`）。
