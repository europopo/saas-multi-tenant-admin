/**
 * 租户相关类型
 */
import type { TenantStatus } from './auth';

/** 租户 */
export interface Tenant {
  id: string;
  name: string;
  /** 唯一标识（code） */
  code: string;
  status: TenantStatus;
  /** 联系人 */
  contact: string;
  email: string;
  /** 授权访问的子系统 id 列表（该租户已开通的子系统，唯一来源） */
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
  page: number;
  pageSize: number;
}
