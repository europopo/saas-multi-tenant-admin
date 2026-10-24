/**
 * 任务领域字典常量
 */
import type { DictItem } from '../types';
import type {
  TaskStatus,
  TaskPriority,
  TaskType,
  ThirdSystemType,
  RetryStrategy,
} from '../types/task';

/** 任务状态字典（含语义色，用于 tag 展示） */
export const TASK_STATUS_DICT: DictItem<TaskStatus>[] = [
  { label: '待执行', value: 'pending', color: 'info' },
  { label: '执行中', value: 'running', color: 'primary' },
  { label: '成功', value: 'success', color: 'success' },
  { label: '失败', value: 'failed', color: 'danger' },
  { label: '已取消', value: 'canceled', color: 'warning' },
];

/** 任务优先级字典 */
export const TASK_PRIORITY_DICT: DictItem<TaskPriority>[] = [
  { label: '低', value: 'low', color: 'info' },
  { label: '中', value: 'medium', color: 'primary' },
  { label: '高', value: 'high', color: 'warning' },
  { label: '紧急', value: 'urgent', color: 'danger' },
];

/** 任务类型字典 */
export const TASK_TYPE_DICT: DictItem<TaskType>[] = [
  { label: '数据同步', value: 'data-sync' },
  { label: '报表生成', value: 'report' },
  { label: '数据备份', value: 'backup' },
  { label: '消息通知', value: 'notify' },
  { label: '自定义', value: 'custom' },
];

/** 第三方系统类型字典 */
export const THIRD_SYSTEM_TYPE_DICT: DictItem<ThirdSystemType>[] = [
  { label: 'ERP', value: 'erp' },
  { label: 'CRM', value: 'crm' },
  { label: 'BI', value: 'bi' },
  { label: '自定义', value: 'custom' },
];

/** 重试策略字典 */
export const RETRY_STRATEGY_DICT: DictItem<RetryStrategy>[] = [
  { label: '不重试', value: 'none' },
  { label: '固定间隔', value: 'fixed' },
  { label: '指数退避', value: 'exponential' },
];

/** 根据 value 获取字典 label */
export function getDictLabel<T extends string | number>(dict: DictItem<T>[], value: T): string {
  return dict.find((d) => d.value === value)?.label ?? String(value);
}

/** 根据 value 获取字典语义色 */
export function getDictColor<T extends string | number>(dict: DictItem<T>[], value: T): string {
  return dict.find((d) => d.value === value)?.color ?? 'info';
}
