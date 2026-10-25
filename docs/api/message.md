# 站内信（通知中心）领域 API 业务文档

> 源文件：`packages/mock/src/modules/message.ts`。类型来源：`packages/shared/src/types/message.ts`。

## 概述

站内信领域负责系统/平台向用户发送通知，以及用户的已读/删除管理。核心设计是**消息本体与用户已读状态分离**：消息本体只读、广播给目标范围；已读状态按「用户 × 消息」各存一份，避免多接收者时已读状态互相干扰。涉及实体：`NoticeMessage`、`MessageReadState`。

## 接口清单

| 方法 | 路径 | 职责 | 关联实体 |
| --- | --- | --- | --- |
| GET | `/message/list` | 当前用户可见消息列表 | NoticeMessage、MessageReadState |
| GET | `/message/unread-count` | 当前用户未读数 | NoticeMessage、MessageReadState |
| POST | `/message/read` | 标记单条已读 | MessageReadState |
| POST | `/message/read-all` | 全部标记已读 | MessageReadState |
| POST | `/message/send` | 发送通知 | NoticeMessage |
| DELETE | `/message/{id}` | 删除消息 | NoticeMessage、MessageReadState |

## 通用约定

- **消息本体**（`NoticeMessage`）：只读，广播给目标范围，`targetType` 决定可见性。
- **已读状态**（`MessageReadState`）：`messageId + userId` 各一条，`isRead` + `readAt`。
- **可见性判定** `isMessageVisible(msg, user)`：
  - `targetType='all'` → 全体可见；
  - `targetType='tenant'` → `user.tenantId ∈ targetIds`；
  - `targetType='user'` → `user.id ∈ targetIds`。

## 接口明细

### [GET] /message/list —— 当前用户可见消息列表

- **请求参数**：

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| userId | string | 是 | - | 当前用户 id |
| readStatus | string | 否 | 'all' | 已读筛选：all/unread/read |
| type | string | 否 | '' | 消息类型：system/business/warning |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 10 | 每页条数 |

- **业务处理流程**：
  1. `userId` 对应用户不存在 → 404「用户不存在」。
  2. 过滤可见消息，映射为 `NoticeMessageView`（合并 `isRead`/`readAt`）。
  3. 按 `readStatus`、`type` 过滤。
  4. 按 `createdAt` 倒序，分页。
- **校验与错误分支**：`404 用户不存在`。
- **响应结构**：`ApiResponse<PageResult<NoticeMessageView>>`。
- **权限与数据隔离**：仅返回当前用户可见的消息（按 targetType 判定）。

### [GET] /message/unread-count —— 当前用户未读数

- **请求参数**：`userId`（必填）。
- **业务处理流程**：
  1. 用户不存在 → 返回 `0`。
  2. 统计「可见 且 无 `isRead=true` 已读记录」的消息数。
- **响应结构**：`ApiResponse<number>`。

### [POST] /message/read —— 标记单条已读

- **请求参数**：`{ messageId, userId }`。
- **业务处理流程**：
  1. 存在 `MessageReadState`（messageId+userId）→ 更新 `isRead=true`、`readAt=now`。
  2. 不存在 → 新增一条已读记录。
- **响应结构**：`ApiResponse<null>`，message「已标记为已读」。

### [POST] /message/read-all —— 全部标记已读

- **请求参数**：`{ userId }`。
- **业务处理流程**：
  1. 用户不存在 → 404「用户不存在」。
  2. 对该用户可见的全部消息，逐条标记已读（已读记录存在则更新，否则新增）。
- **响应结构**：`ApiResponse<null>`，message「已全部标记为已读」。

### [POST] /message/send —— 发送通知

- **请求参数**：`MessageSendParams`（`title`/`content` 必填，`type`/`targetType`/`targetIds`/`sender`/`tenantId` 可选）。

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| title | string | 是 | - | 标题 |
| content | string | 是 | - | 内容 |
| type | string | 否 | 'system' | system/business/warning |
| targetType | string | 是 | - | all/tenant/user |
| targetIds | string[] | 否 | - | targetType 非 all 时必填 |
| sender | string | 否 | '系统' | 发送者 |
| tenantId | string/null | 否 | null | 消息归属租户 |

- **业务处理流程**：
  1. `title`/`content` 为空 → 422「标题和内容不能为空」。
  2. `targetType !== 'all'` 且 `targetIds` 为空 → 422「请选择接收对象」。
  3. 创建 `NoticeMessage`（`targetType='all'` 时 `targetIds` 置 `undefined`）。
- **校验与错误分支**：`422 标题和内容不能为空`；`422 请选择接收对象`。
- **响应结构**：`ApiResponse<NoticeMessage>`，message「发送成功」。

### [DELETE] /message/{id} —— 删除消息

- **请求参数**：路径 `id`，查询参数 `userId`（可选）。
- **业务处理流程**：
  1. 消息不存在 → 404「消息不存在」。
  2. 传了 `userId` → 仅删除该用户对这条消息的已读状态记录（消息本体保留给其他接收者）。
  3. 未传 `userId` → 删除消息本体 + 全部关联已读状态记录。
- **校验与错误分支**：`404 消息不存在`。
- **响应结构**：`ApiResponse<null>`，message「已删除」。

## 业务规则汇总

- **消息本体与已读状态分离**：一条消息广播给多人，各自已读状态互不影响。
- **可见性三态**：`all`（全体）、`tenant`（按 `user.tenantId ∈ targetIds`）、`user`（按 `user.id ∈ targetIds`）。
- **未读数** = 可见消息数 − 已读消息数（`isRead=true` 的记录数）。
- **删除语义**：用户删除是「移除自己的接收记录」，不删除消息本体；仅管理员/发送者可删本体。

## 关键边界与陷阱

- `message/list` 的 `userId` 是**必填**，缺失时返回 404「用户不存在」；后端必须据此做目标范围过滤，不能返回全量消息。
- 平台级消息（`tenantId=null`）对**所有**可见范围内的用户可见，不受租户隔离；租户定向消息（`targetType='tenant'`）按 `targetIds` 精确匹配。
- `unread-count` 对不存在的用户**返回 0 而非报错**（区别于 list 的 404），后端实现需保持一致。
- 删除接口的 `userId` 通过 **query 参数**传递（非 body），前端调用 `messageApi.remove(id, userId)` 时需注意 alova DELETE 的 params 传参方式。
