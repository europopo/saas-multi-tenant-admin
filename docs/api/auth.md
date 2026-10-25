# 认证领域 API 业务文档

> 源文件：`packages/mock/src/modules/auth.ts`。类型来源：`packages/shared/src/types/auth.ts`。

## 概述

认证领域负责账号密码登录、退出登录、获取当前登录用户信息。涉及实体：`UserInfo`、`Role`，以及登录态 `token → userId` 映射与 `username → password` 凭据表。

## 接口清单

| 方法 | 路径 | 职责 | 关联实体 |
| --- | --- | --- | --- |
| POST | `/auth/login` | 账号密码登录，签发 token | User、Role、token |
| POST | `/auth/logout` | 退出登录，注销 token | token |
| GET | `/auth/me` | 根据 token 反查当前用户 | User、Role、token |

## 通用约定

- 登录成功签发 `token`（格式 `mock-token-{userId}-{时间戳}`），后端应以不可伪造的签名 token 替代，但语义一致。
- 用户信息统一经 `resolveUserAuth` 注入运行时派生字段 `scope` 与 `accessibleSubsystems`。

## 接口明细

### [POST] /auth/login —— 账号密码登录

- **触发场景 / 业务目的**：用户输入用户名密码登录，成功后签发 token 并返回用户信息（含聚合后的权限域）。
- **请求参数**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 登录用户名 |
| password | string | 是 | 明文密码（Mock；后端应为加密存储） |

- **业务处理流程**：
  1. 按 `username` 定位 `userId`：先查用户表 `username` 匹配的 `id`，回退到内置账号映射（`admin` / `tenant_admin` / `member`）。
  2. 若 `userId` 不存在 → 返回 401「用户名或密码错误」。
  3. 校验凭据表中该 `username` 的密码是否与入参一致，不一致 → 401「用户名或密码错误」。
  4. 按 `userId` 查用户，不存在 → 404「用户不存在」。
  5. 用户 `status === 'disabled'` → 403「账号已被停用」。
  6. 签发 token 并登记 `token → userId`，返回 `{ token, user }`。
- **校验与错误分支**：

| 条件 | code | message |
| --- | --- | --- |
| 用户名不存在 | 401 | 用户名或密码错误 |
| 密码不匹配 | 401 | 用户名或密码错误 |
| 用户不存在 | 404 | 用户不存在 |
| 用户被停用 | 403 | 账号已被停用 |

- **副作用 / 联动数据变更**：向 token 存储写入 `token → userId`。
- **响应结构**：`ApiResponse<LoginResult>`，`LoginResult = { token, user: UserInfo }`。
- **权限与数据隔离**：无隔离；登录后由 `resolveUserAuth` 注入 `scope` / `accessibleSubsystems`。

### [POST] /auth/logout —— 退出登录

- **触发场景 / 业务目的**：注销当前会话 token。
- **请求参数**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| token | string | 否 | 待注销的 token；缺省则无操作 |

- **业务处理流程**：若传入 `token`，从 token 存储删除该键；无论是否存在均返回成功。
- **校验与错误分支**：无（幂等）。
- **副作用 / 联动数据变更**：删除 token。
- **响应结构**：`ApiResponse<null>`，message「已退出登录」。
- **权限与数据隔离**：无。

### [GET] /auth/me —— 获取当前用户信息

- **触发场景 / 业务目的**：前端刷新/初始化时根据 token 反查当前登录用户，用于恢复登录态与权限。
- **请求参数**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| token | string | 否 | 登录 token；缺省或无效视为未登录 |

- **业务处理流程**：
  1. 用 `token` 查 token 存储得到 `userId`。
  2. 按 `userId` 查用户。
  3. 用户不存在（含 token 缺失/失效）→ 401「未登录或登录已失效」。
  4. 返回经 `resolveUserAuth` 注入后的 `UserInfo`。
- **校验与错误分支**：

| 条件 | code | message |
| --- | --- | --- |
| token 缺失/失效/用户不存在 | 401 | 未登录或登录已失效 |

- **副作用 / 联动数据变更**：无。
- **响应结构**：`ApiResponse<UserInfo>`。
- **权限与数据隔离**：无。

## 业务规则汇总

- **内置账号映射**（`ACCOUNT_USER_MAP`）：`admin → user-admin`、`tenant_admin → user-tenant-admin`、`member → user-member`。
- **内置凭据**：`admin/admin123`、`tenant_admin/tenant123`、`member/member123`（开发演示用，后端应替换为真实用户体系）。
- **登录态模型**：`token` 为会话凭证，`resolveUserAuth` 为统一权限聚合入口，登录/用户列表/角色变更三处必须一致。

## 关键边界与陷阱

- 登录失败**统一返回「用户名或密码错误」**，不区分用户名不存在还是密码错（防枚举）。
- `status === 'disabled'` 的用户即使密码正确也拒绝登录（403），与「用户不存在」区分。
- `/auth/me` 的 401 语义覆盖「未登录」与「token 已失效」两种情况，后端实现时需统一处理。
