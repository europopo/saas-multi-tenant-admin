# SSO 单点登录领域 API 业务文档

> 源文件：`packages/mock/src/modules/sso.ts`。类型来源：`packages/shared/src/types/auth.ts`（`SsoProvider`、`SsoLoginParams`、`SsoCallbackParams`、`SsoLoginResult`）。

## 概述

SSO 领域模拟真实的 OIDC / 企业身份认证流程：获取可用提供商 → 发起授权（返回授权地址 + state）→ 回调校验授权码换取 token 与用户信息（首次登录自动建账号）→ 查询绑定关系。涉及实体：`SsoProvider`、`UserInfo`、`token`。

## 接口清单

| 方法 | 路径 | 职责 | 关联实体 |
| --- | --- | --- | --- |
| GET | `/sso/providers` | 启用的 SSO 提供商列表 | SsoProvider |
| POST | `/sso/authorize` | 发起授权（生成 state + 授权地址） | SsoProvider |
| POST | `/sso/callback` | 回调校验，换取 token 与用户 | SsoProvider、User、token |
| GET | `/sso/bindings` | 查询用户绑定的 SSO 提供商 | SsoProvider、User |

## 通用约定

- 模拟 IdP 用户目录 `IDP_USERS`（provider → username/nickname/email），见 `sso.ts` 顶部。
- `state` 以 `sso-state` 前缀，`code` 以 `mock-auth-code-` 前缀（模拟校验用）。

## 接口明细

### [GET] /sso/providers —— 启用的 SSO 提供商列表

- **业务处理流程**：返回 `status === 'active'` 的提供商。
- **响应结构**：`ApiResponse<SsoProvider[]>`。

### [POST] /sso/authorize —— 发起授权

- **请求参数**（`SsoLoginParams`）：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| provider | string | 是 | 提供商编码 |
| redirect | string | 否 | 登录后跳转地址 |

- **业务处理流程**：
  1. 查 `code === provider && status === 'active'` 的提供商，不存在 → 404「SSO 提供商不存在或已停用」。
  2. 生成 `state`（`sso-state-` 前缀），拼接模拟授权地址（含 provider/state/redirect_uri）。
- **校验与错误分支**：`404 SSO 提供商不存在或已停用`。
- **响应结构**：`ApiResponse<{ provider, state, authorizeUrl, redirect }>`。

### [POST] /sso/callback —— 回调校验，换取 token 与用户

- **请求参数**（`SsoCallbackParams`）：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| provider | string | 是 | 提供商编码 |
| code | string | 是 | 授权码（模拟，`mock-auth-code-` 前缀） |
| state | string | 否 | 状态值（防 CSRF） |

- **业务处理流程**：
  1. 查提供商，不存在或非 active → 404「SSO 提供商不存在或已停用」。
  2. 校验 `state`：若传入且不以 `sso-state` 开头 → 401「state 校验失败，请求可能被篡改」。
  3. 校验 `code`：为空或不以 `mock-auth-code-` 开头 → 401「授权码无效或已过期」。
  4. 从 `IDP_USERS[provider]` 取 IdP 用户，无 → 404「该 SSO 提供商暂无可用账号」。
  5. 按 `email`（大小写不敏感）查已有用户；不存在则**自动创建**（首次登录）：角色 `tenant_user`，`tenantId='tenant-demo'`，`isNewUser=true`。
  6. 签发 token 并登记；返回 `{ token, user, isNewUser, provider }`。
- **校验与错误分支**：

| 条件 | code | message |
| --- | --- | --- |
| 提供商不存在/停用 | 404 | SSO 提供商不存在或已停用 |
| state 校验失败 | 401 | state 校验失败，请求可能被篡改 |
| 授权码无效 | 401 | 授权码无效或已过期 |
| 无可用账号 | 404 | 该 SSO 提供商暂无可用账号 |

- **副作用 / 联动数据变更**：可能新增用户；写入 token。
- **响应结构**：`ApiResponse<SsoLoginResult>`，`SsoLoginResult = { token, user, isNewUser, provider }`。
- **权限与数据隔离**：无。

### [GET] /sso/bindings —— 查询用户绑定的 SSO 提供商

- **请求参数**：`userId`（查询参数）。
- **业务处理流程**：
  1. 用户不存在 → 404「用户不存在」。
  2. 返回用户 email 域名 + 全部 active 提供商（`bound=true`，演示语义）。
- **响应结构**：`ApiResponse<{ userId, email, domain, providers: [{code,name,bound}] }>`。

## 业务规则汇总

- **首次登录自动建号**：SSO 回调时按 email 匹配，无则自动创建 `tenant_user` 角色用户（`isNewUser=true`）。
- **授权码/state 校验**：均为模拟校验，真实后端应对接 IdP 的 token 交换与签名校验。

## 关键边界与陷阱

- `authorize` 校验提供商时**同时要求 `status === 'active'`**；`callback` 同样校验 active。
- `callback` 的 state 校验是「若传入才校验」，空 state 不拦截（后端应视安全要求决定是否强制）。
- 用户匹配按 email **大小写不敏感**。
- 模拟 IdP 目录 `IDP_USERS` 固定映射 provider → 企业用户，后端应替换为真实 IdP 用户目录。
