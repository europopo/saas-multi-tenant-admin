# 门户仪表盘领域 API 业务文档

> 源文件：`packages/mock/src/modules/dashboard.ts`。类型来源：`packages/shared/src/types/dashboard.ts`。

## 概述

门户仪表盘为平台首页提供聚合统计：租户总数/活跃数、子系统数、用户数、租户增长趋势（近 6 个月）、子系统使用情况、最近租户、最近活动。涉及实体：`Tenant`、`Subsystem`、`User`、`ActivityRecord`。

## 接口清单

| 方法 | 路径 | 职责 | 关联实体 |
| --- | --- | --- | --- |
| GET | `/portal/dashboard` | 门户仪表盘聚合数据 | Tenant、Subsystem、User、Activity |

## 接口明细

### [GET] /portal/dashboard —— 门户仪表盘数据

- **触发场景 / 业务目的**：平台首页一次性返回所有聚合统计。
- **请求参数**：无。
- **业务处理流程**：
  1. `activeTenants` = 状态为 `active` 的租户数。
  2. `tenantGrowth`：近 6 个月，每月统计该月创建的租户数（按 `createdAt` 所在自然月）。
  3. `subsystemUsage`：每个子系统的 `tenantCount` = 该子系统被多少租户开通（`tenant.subsystemIds` 含其 id）。
  4. `recentTenants`：按 `createdAt` 倒序取前 5。
  5. `recentActivities`：按 `timestamp` 倒序全量返回。
- **校验与错误分支**：无。
- **副作用 / 联动数据变更**：无。
- **响应结构**：`ApiResponse<PortalDashboardData>`，字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| stats.totalTenants | number | 租户总数 |
| stats.activeTenants | number | 活跃租户数 |
| stats.totalSubsystems | number | 子系统总数 |
| stats.totalUsers | number | 用户总数 |
| tenantGrowth | TenantGrowthPoint[] | 近 6 个月租户增长（`{month: 'YYYY-MM', count}`） |
| subsystemUsage | SubsystemUsage[] | 子系统使用情况（`{subsystemId, subsystemName, tenantCount}`） |
| recentTenants | Tenant[] | 最近 5 个租户 |
| recentActivities | ActivityRecord[] | 活动记录（倒序） |

- **权限与数据隔离**：平台级聚合，无租户隔离。

## 业务规则汇总

- `tenantGrowth` 固定近 6 个月窗口（含当月），`month` 格式 `YYYY-MM`。
- `subsystemUsage` 遍历全部子系统（含 disabled），统计开通该子系统的租户数。
- `recentTenants` 取前 5 条；`recentActivities` 全量倒序。

## 关键边界与陷阱

- `subsystemUsage` 不区分子系统状态（disabled 也统计），后端需保持一致。
- `tenantGrowth` 按自然月聚合，用「月初 <= createdAt < 月初+30天」近似，真实后端建议按日历月精确聚合。
