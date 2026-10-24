/**
 * 租户相关类型
 */
import type { TenantStatus } from './auth';

/** 套餐信息 */
export interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  /** 计费周期 */
  billingCycle: 'monthly' | 'yearly';
  description: string;
  /** 功能特性描述 */
  features: string[];
  /** 功能限制（用于套餐配额展示） */
  quotas: PlanQuota;
  status: 'active' | 'disabled';
  createdAt: string;
}

/** 套餐配额 */
export interface PlanQuota {
  /** 最大租户数 */
  maxTenants?: number;
  /** 最大用户数 */
  maxUsers: number;
  /** 最大子系统数 */
  maxSubsystems: number;
  /** 是否支持自定义域名 */
  customDomain: boolean;
  /** 是否支持审计日志 */
  auditLog: boolean;
}

/** 租户 */
export interface Tenant {
  id: string;
  name: string;
  /** 唯一标识（code） */
  code: string;
  status: TenantStatus;
  /** 当前订阅套餐 */
  planId: string;
  planName?: string;
  /** 联系人 */
  contact: string;
  email: string;
  /** 授权访问的子系统 id 列表 */
  subsystemIds: string[];
  createdAt: string;
  /** 到期时间 */
  expiredAt: string;
  /** 租户用户数 */
  userCount?: number;
}

/** 子系统 */
export interface Subsystem {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  /** 入口地址 */
  entryUrl: string;
  status: 'active' | 'disabled';
  /** 是否默认演示子系统 */
  isDefault?: boolean;
  createdAt: string;
}

/** 租户查询参数 */
export interface TenantQuery {
  keyword?: string;
  status?: TenantStatus | '';
  planId?: string;
  page: number;
  pageSize: number;
}
