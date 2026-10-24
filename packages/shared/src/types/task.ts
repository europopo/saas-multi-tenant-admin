/**
 * 任务子系统相关类型
 */

/** 任务状态 */
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'canceled';

/** 任务优先级 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/** 任务类型 */
export type TaskType = 'data-sync' | 'report' | 'backup' | 'notify' | 'custom';

/** 重试策略 */
export type RetryStrategy = 'none' | 'fixed' | 'exponential';

/** 第三方系统类型 */
export type ThirdSystemType = 'erp' | 'crm' | 'bi' | 'custom';

/** 第三方系统 */
export interface ThirdSystem {
  id: string;
  name: string;
  code: string;
  description: string;
  type: ThirdSystemType;
  status: 'active' | 'disabled';
  /** 接入地址 */
  endpoint: string;
  /** 负责人 */
  owner: string;
  /** 脱敏凭证（演示用） */
  credentialMasked: string;
  createdAt: string;
  /** 关联任务数 */
  taskCount?: number;
}

/** 任务配置 */
export interface TaskConfig {
  /** 执行参数（JSON 结构，随任务类型不同而不同） */
  params: Record<string, unknown>;
  /** 超时时间（秒） */
  timeout: number;
  /** 最大重试次数 */
  maxRetry: number;
  /** 重试策略 */
  retryStrategy: RetryStrategy;
  /** 是否允许手动触发 */
  allowManual: boolean;
  /** 是否允许取消 */
  allowCancel: boolean;
  /** 定时执行配置（cron 表达式，可选） */
  cron?: string;
}

/** 任务 */
export interface Task {
  id: string;
  name: string;
  code: string;
  /** 所属第三方系统 id */
  thirdSystemId: string;
  thirdSystemName?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  /** 发起时间 */
  createdAt: string;
  /** 开始执行时间 */
  startedAt?: string;
  /** 完成时间 */
  finishedAt?: string;
  /** 执行耗时（毫秒） */
  duration?: number;
  /** 重试次数 */
  retryCount: number;
  /** 结果摘要 */
  resultSummary?: string;
  /** 错误信息 */
  errorMessage?: string;
  config: TaskConfig;
  /** 创建人 */
  creator: string;
  remark?: string;
}

/** 任务执行日志 */
export interface TaskLog {
  id: string;
  taskId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

/** 任务状态变更历史 */
export interface TaskStatusHistory {
  id: string;
  taskId: string;
  from: TaskStatus;
  to: TaskStatus;
  operator: string;
  remark?: string;
  timestamp: string;
}

/** 任务重试记录 */
export interface TaskRetryRecord {
  id: string;
  taskId: string;
  attempt: number;
  result: 'success' | 'failed';
  errorMessage?: string;
  timestamp: string;
}

/** 任务查询参数 */
export interface TaskQuery {
  keyword?: string;
  thirdSystemId?: string;
  type?: TaskType | '';
  status?: TaskStatus | '';
  priority?: TaskPriority | '';
  startTime?: string;
  endTime?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

/** 任务类型规则配置 */
export interface TaskTypeRule {
  id: string;
  type: TaskType;
  name: string;
  defaultPriority: TaskPriority;
  maxRetry: number;
  retryStrategy: RetryStrategy;
  timeout: number;
  allowManual: boolean;
  allowCancel: boolean;
  enabled: boolean;
  description?: string;
}

/** 系统基础设置 */
export interface SystemSettings {
  systemName: string;
  systemDescription: string;
  defaultPageSize: number;
  /** 默认任务筛选条件 */
  defaultTaskFilter: Partial<TaskQuery>;
  /** 日志保留周期（天） */
  logRetentionDays: number;
  /** 任务状态说明 */
  taskStatusGuide: string;
  /** 任务执行策略说明 */
  executionStrategyGuide: string;
}

/** 仪表盘统计数据 */
export interface DashboardStats {
  /** 任务总数 */
  totalTasks: number;
  pendingTasks: number;
  runningTasks: number;
  successTasks: number;
  failedTasks: number;
  todayTasks: number;
  /** 任务成功率（0-100） */
  successRate: number;
}

/** 趋势数据点 */
export interface TrendPoint {
  date: string;
  total: number;
  success: number;
  failed: number;
}

/** 第三方系统任务分布 */
export interface ThirdSystemDistribution {
  thirdSystemId: string;
  thirdSystemName: string;
  count: number;
}

/** 仪表盘完整数据 */
export interface DashboardData {
  stats: DashboardStats;
  trend: TrendPoint[];
  distribution: ThirdSystemDistribution[];
  recentTasks: Task[];
  recentFailedTasks: Task[];
}
