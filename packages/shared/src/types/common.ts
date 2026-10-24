/**
 * 通用基础类型定义
 * 全系统共享的响应结构、分页、字典等基础类型。
 */

/** 标准 API 响应结构 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码，0 表示成功 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 业务数据 */
  data: T;
  /** 请求追踪 id（用于排障） */
  traceId?: string;
}

/** 分页请求参数 */
export interface PageQuery {
  page: number;
  pageSize: number;
}

/** 分页响应结构 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 排序参数 */
export interface SortQuery {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  order: 'asc' | 'desc';
}

/** 通用字典项 */
export interface DictItem<T extends string | number = string> {
  label: string;
  value: T;
  /** 用于展示的语义色（可选） */
  color?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/** 通用 ID */
export type Id = string | number;
