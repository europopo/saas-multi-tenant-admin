# 任务领域 API 业务文档

> 源文件：`packages/mock/src/modules/task.ts`。类型来源：`packages/shared/src/types/task.ts`。

## 概述

任务领域是核心业务域，涵盖任务的增删改查、状态机流转（触发/取消/重试）、执行日志/历史/重试记录查询、看板统计，以及第三方系统、任务类型规则、系统设置的管理。涉及实体：`Task`、`TaskLog`、`TaskStatusHistory`、`TaskRetryRecord`、`ThirdSystem`、`TaskTypeRule`、`SystemSettings`。

## 接口清单

| 方法 | 路径 | 职责 | 关联实体 |
| --- | --- | --- | --- |
| GET | `/task/list` | 任务分页列表（多维筛选+排序） | Task |
| GET | `/task/{id}` | 任务详情 | Task |
| GET | `/task/{id}/logs` | 任务执行日志 | TaskLog |
| GET | `/task/{id}/history` | 任务状态历史 | TaskStatusHistory |
| GET | `/task/{id}/retries` | 任务重试记录 | TaskRetryRecord |
| POST | `/task/create` | 创建任务 | Task、TaskLog、TaskTypeRule |
| PUT | `/task/update` | 编辑任务（仅 pending） | Task |
| POST | `/task/trigger` | 手动触发任务 | Task、TaskStatusHistory |
| POST | `/task/cancel` | 取消任务 | Task |
| POST | `/task/retry` | 重试失败任务 | Task、TaskRetryRecord |
| DELETE | `/task/{id}` | 删除任务（级联清理） | Task、Log、History、Retry |
| POST | `/task/batch-delete` | 批量删除 | Task、Log、History、Retry |
| GET | `/task/dashboard` | 任务看板统计 | Task、ThirdSystem |
| GET | `/third-system/list` | 第三方系统列表 | ThirdSystem、Task |
| GET | `/third-system/{id}` | 第三方系统详情 | ThirdSystem、Task |
| POST | `/third-system/create` | 创建第三方系统 | ThirdSystem |
| PUT | `/third-system/update` | 更新第三方系统 | ThirdSystem |
| POST | `/third-system/toggle-status` | 第三方系统启停 | ThirdSystem |
| GET | `/task-type/list` | 任务类型规则列表 | TaskTypeRule |
| PUT | `/task-type/update` | 更新任务类型规则 | TaskTypeRule |
| POST | `/task-type/toggle-status` | 任务类型规则启停 | TaskTypeRule |
| GET | `/settings` | 系统基础设置 | SystemSettings |
| PUT | `/settings` | 更新系统设置 | SystemSettings |

## 通用约定

- 任务列表默认按 `createdAt` 倒序；支持 `sortField`/`sortOrder` 自定义排序。
- 日志/历史/重试记录均按 `timestamp` 倒序。
- 任务创建时按「任务类型规则」注入默认配置（`ruleFor` 查 `taskTypeRules` 中 `enabled=true` 的规则）。

## 任务状态机

```
pending（待执行，已创建未开始）
  ├─ trigger ──────────────► running（执行中）
  ├─ cancel ───────────────► canceled（已取消）
  └─ retry（仅 failed）────► pending
running
  └─ cancel ───────────────► canceled
failed（失败）
  └─ retry ────────────────► pending
success / canceled（终态）
```

## 接口明细

### [GET] /task/list —— 任务分页列表

- **请求参数**（`TaskQuery`）：

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| keyword | string | 否 | '' | 匹配 name / code / id |
| thirdSystemId | string | 否 | - | 第三方系统筛选 |
| type | string | 否 | '' | 任务类型筛选 |
| status | string | 否 | '' | 状态筛选 |
| priority | string | 否 | '' | 优先级筛选 |
| startTime | string | 否 | - | createdAt >= startTime |
| endTime | string | 否 | - | createdAt <= endTime |
| sortField | string | 否 | createdAt | 排序字段 |
| sortOrder | string | 否 | desc | 排序方向 |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 10 | 每页条数 |

- **业务处理流程**：关键词 → 多维筛选（thirdSystemId/type/status/priority/startTime/endTime）→ 排序 → 分页。
- **响应结构**：`ApiResponse<PageResult<Task>>`。

### [GET] /task/{id} —— 任务详情

- **业务处理流程**：不存在 → 404「任务不存在」。
- **响应结构**：`ApiResponse<Task>`。

### [GET] /task/{id}/logs —— 任务执行日志

- **业务处理流程**：按 `taskId` 过滤，`timestamp` 倒序（无任务存在校验，返回空数组）。
- **响应结构**：`ApiResponse<TaskLog[]>`。

### [GET] /task/{id}/history —— 任务状态变更历史

- **业务处理流程**：按 `taskId` 过滤，`timestamp` 倒序（无任务存在校验，返回空数组）。
- **响应结构**：`ApiResponse<TaskStatusHistory[]>`。

### [GET] /task/{id}/retries —— 任务重试记录

- **业务处理流程**：按 `taskId` 过滤，`timestamp` 倒序（无任务存在校验，返回空数组）。
- **响应结构**：`ApiResponse<TaskRetryRecord[]>`。

### [POST] /task/create —— 创建任务

- **请求参数**：`Partial<Task>`，`name`/`code`/`thirdSystemId`/`type` 必填。
- **业务处理流程**：
  1. 必填缺失 → 422「任务名称、编码、第三方系统和类型不能为空」。
  2. `code` 已存在 → 422「任务编码已存在」。
  3. 查任务类型规则（`ruleFor(type)`），注入默认配置：`priority=body.priority ?? rule.defaultPriority ?? 'medium'`；`timeout=body.config.timeout ?? rule.timeout ?? 600`；`maxRetry=... ?? 3`；`retryStrategy=... ?? 'fixed'`；`allowManual=... ?? true`；`allowCancel=... ?? true`。
  4. 初始状态：`status='pending'`、`retryCount=0`、`thirdSystemName` 从第三方系统反查。
  5. **联动**：写入一条 `info` 级别任务日志「任务已创建并入队」。
- **校验与错误分支**：`422 任务名称、编码、第三方系统和类型不能为空`；`422 任务编码已存在`。
- **响应结构**：`ApiResponse<Task>`，message「创建成功」。

### [PUT] /task/update —— 编辑任务（仅 pending）

- **请求参数**：`Partial<Task> & { id }`。
- **业务处理流程**：
  1. 不存在 → 404「任务不存在」。
  2. `status !== 'pending'` → 422「仅待执行状态的任务允许编辑配置」。
  3. 更新 `code` 冲突（排除自身）→ 422「任务编码已存在」。
  4. 合并字段，强制 `status` 保持 `pending`。
- **校验与错误分支**：`404 任务不存在`；`422 仅待执行状态的任务允许编辑配置`；`422 任务编码已存在`。
- **响应结构**：`ApiResponse<Task>`，message「更新成功」。

### [POST] /task/trigger —— 手动触发任务

- **请求参数**：`{ id }`。
- **业务处理流程**：
  1. 不存在 → 404「任务不存在」。
  2. `config.allowManual === false` → 403「该任务类型不允许手动触发」。
  3. `status === 'running'` → 422「任务正在执行中」。
  4. `status === 'success'` → 422「任务已成功完成，无需重复触发」。
  5. 置 `status='running'`、`startedAt=now`、`finishedAt=undefined`；写状态历史 `pending → running`。
- **校验与错误分支**：`404`；`403 该任务类型不允许手动触发`；`422 任务正在执行中`；`422 任务已成功完成，无需重复触发`。
- **副作用 / 联动数据变更**：写 `TaskStatusHistory`。
- **响应结构**：`ApiResponse<Task>`，message「任务已触发」。

### [POST] /task/cancel —— 取消任务

- **请求参数**：`{ id }`。
- **业务处理流程**：
  1. 不存在 → 404「任务不存在」。
  2. `config.allowCancel === false` → 403「该任务类型不允许取消」。
  3. `status` 为 `success`/`canceled` → 422「任务已结束，无法取消」。
  4. 置 `status='canceled'`、`finishedAt=now`。
- **校验与错误分支**：`404`；`403 该任务类型不允许取消`；`422 任务已结束，无法取消`。
- **响应结构**：`ApiResponse<Task>`，message「任务已取消」。

### [POST] /task/retry —— 重试失败任务

- **请求参数**：`{ id }`。
- **业务处理流程**：
  1. 不存在 → 404「任务不存在」。
  2. `status !== 'failed'` → 422「仅失败的任务允许重试」。
  3. 置 `status='pending'`、清空 `startedAt`/`finishedAt`/`errorMessage`；写重试记录（`attempt=retryCount+1`、`result='failed'`、`errorMessage='由用户手动触发重试'`）。
- **校验与错误分支**：`404`；`422 仅失败的任务允许重试`。
- **副作用 / 联动数据变更**：写 `TaskRetryRecord`。
- **响应结构**：`ApiResponse<Task>`，message「任务已重新入队」。

### [DELETE] /task/{id} —— 删除任务（级联清理）

- **业务处理流程**：不存在 → 404「任务不存在」；删除任务，并清理其日志/历史/重试记录。
- **副作用 / 联动数据变更**：级联删除该任务的 `taskLogs`、`taskStatusHistories`、`taskRetryRecords`。
- **响应结构**：`ApiResponse<Task>`，message「删除成功」。

### [POST] /task/batch-delete —— 批量删除

- **请求参数**：`{ ids: string[] }`。
- **业务处理流程**：
  1. `ids` 非数组或为空 → 422「请选择要删除的任务」。
  2. 删除所有命中任务，级联清理关联记录。
- **校验与错误分支**：`422 请选择要删除的任务`。
- **响应结构**：`ApiResponse<number>`（删除数量），message「已删除 {n} 个任务」。

### [GET] /task/dashboard —— 任务看板统计

- **请求参数**：`thirdSystemId`、`startTime`、`endTime`（可选筛选）。
- **业务处理流程**：筛选后统计总数、各状态数、今日任务数、成功率（保留 1 位小数）；生成近 7 天趋势；第三方系统分布（仅 active 系统且 count>0）；最近 8 条任务、最近 8 条失败任务。
- **响应结构**：`ApiResponse<DashboardData>`（`stats`/`trend`/`distribution`/`recentTasks`/`recentFailedTasks`）。

### [GET] /third-system/list —— 第三方系统列表

- **请求参数**：`keyword`、`status`（可选）。
- **业务处理流程**：按 `createdAt` 倒序，关键词/状态过滤，每条附加 `taskCount`（关联任务数）。
- **响应结构**：`ApiResponse<ThirdSystem[]>`（含 `taskCount`）。

### [GET] /third-system/{id} —— 第三方系统详情

- **业务处理流程**：不存在 → 404「第三方系统不存在」；附加 `taskCount`。
- **响应结构**：`ApiResponse<ThirdSystem>`。

### [POST] /third-system/create —— 创建第三方系统

- **请求参数**：`Partial<ThirdSystem>`，`name`/`code`/`type` 必填。
- **业务处理流程**：
  1. 必填缺失 → 422「系统名称、编码和类型不能为空」。
  2. `code` 已存在 → 422「编码已存在」。
  3. 默认值：`description=''`、`status='active'`、`endpoint=''`、`owner=''`、`credentialMasked='sk_****_demo'`。
- **校验与错误分支**：`422 系统名称、编码和类型不能为空`；`422 编码已存在`。
- **响应结构**：`ApiResponse<ThirdSystem>`，message「创建成功」。

### [PUT] /third-system/update —— 更新第三方系统

- **业务处理流程**：不存在 → 404「第三方系统不存在」；合并字段（保留 `id`）。
- **响应结构**：`ApiResponse<ThirdSystem>`，message「更新成功」。

### [POST] /third-system/toggle-status —— 第三方系统启停

- **请求参数**：`{ id, status }`，`status` 取值 `active` | `disabled`。
- **响应结构**：`ApiResponse<ThirdSystem>`，message「已启用」/「已停用」。

### [GET] /task-type/list —— 任务类型规则列表

- **响应结构**：`ApiResponse<TaskTypeRule[]>`。

### [PUT] /task-type/update —— 更新任务类型规则

- **业务处理流程**：不存在 → 404「规则不存在」；合并字段。
- **响应结构**：`ApiResponse<TaskTypeRule>`，message「更新成功」。

### [POST] /task-type/toggle-status —— 任务类型规则启停

- **请求参数**：`{ id, enabled }`（boolean）。
- **业务处理流程**：不存在 → 404「规则不存在」；更新 `enabled`。
- **响应结构**：`ApiResponse<TaskTypeRule>`，message「已启用」/「已停用」。

### [GET] /settings —— 系统基础设置

- **响应结构**：`ApiResponse<SystemSettings>`。

### [PUT] /settings —— 更新系统设置

- **请求参数**：`Partial<SystemSettings>`。
- **业务处理流程**：浅合并。
- **响应结构**：`ApiResponse<SystemSettings>`，message「保存成功」。

## 业务规则汇总

- **任务类型规则驱动默认值**：创建任务时按 `enabled` 规则注入 priority/timeout/maxRetry/retryStrategy/allowManual/allowCancel。
- **状态机约束**：仅 `pending` 可编辑/触发；`running`/`success` 不可重复触发；`success`/`canceled` 不可取消；仅 `failed` 可重试。
- **类型规则约束**：`allowManual=false` 禁手动触发（403）；`allowCancel=false` 禁取消（403）。
- **级联清理**：删除/批量删除任务时，同步清理日志、状态历史、重试记录。
- **唯一性约束**：`task.code`、`thirdSystem.code` 唯一。

## 关键边界与陷阱

- `trigger` 的校验顺序：先 403（allowManual）→ 再 422（running）→ 再 422（success），后端需按此顺序短路返回。
- `retry` 不递增 `retryCount`（只写一条 `attempt=retryCount+1` 的重试记录），任务本身 `retryCount` 保持不变。
- `/task/{id}/logs` 等关联查询**不做任务存在性校验**，任务不存在时返回空数组而非 404。
- 看板 `successRate` 保留 1 位小数（`Math.round(x*1000)/10`）。
- `distribution` 仅统计 `status=active` 的第三方系统且 `count>0` 的条目。
