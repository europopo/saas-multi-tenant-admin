/**
 * 门户仪表盘相关类型
 */
import type { Tenant } from './tenant';

/** 门户仪表盘统计 */
export interface PortalStats {
  totalTenants: number;
  activeTenants: number;
  totalSubsystems: number;
  totalUsers: number;
}

/** 租户增长趋势点 */
export interface TenantGrowthPoint {
  month: string;
  count: number;
}

/** 子系统使用情况 */
export interface SubsystemUsage {
  subsystemId: string;
  subsystemName: string;
  /** 使用该子系统的租户数 */
  tenantCount: number;
}

/** 活动记录 */
export interface ActivityRecord {
  id: string;
  type: 'login' | 'tenant' | 'subsystem' | 'user' | 'task';
  description: string;
  operator: string;
  timestamp: string;
}

/** 门户仪表盘数据 */
export interface PortalDashboardData {
  stats: PortalStats;
  tenantGrowth: TenantGrowthPoint[];
  subsystemUsage: SubsystemUsage[];
  recentTenants: Tenant[];
  recentActivities: ActivityRecord[];
}
