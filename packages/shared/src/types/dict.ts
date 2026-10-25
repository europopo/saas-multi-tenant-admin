/**
 * 数据字典相关类型
 *
 * 字典采用「纯租户级」模型：tenantId 必填，业务枚举由各租户自行配置，
 * 与用户/任务等业务数据保持一致的数据隔离原则。系统内置固定枚举
 * （如用户状态）走代码联合类型，不进入字典表。
 */

/** 字典类型（如「任务优先级」） */
export interface DictType {
  id: string;
  /** 字典名称 */
  name: string;
  /** 字典唯一编码，如 task_priority */
  type: string;
  status: 'active' | 'disabled';
  /** 所属租户（纯租户级，恒为具体租户 id） */
  tenantId: string;
  /** 备注 */
  remark?: string;
  createdAt: string;
}

/** 字典数据（字典类型下的具体枚举项） */
export interface DictData {
  id: string;
  /** 关联字典类型 id */
  typeId: string;
  /** 显示文案（默认语言） */
  label: string;
  /** 英文文案（多语言预留位，本次仅预留字段，不接交互） */
  labelEn?: string;
  /** 存储值（英文编码，永不翻译，参与逻辑判断） */
  value: string;
  /** 排序 */
  sort: number;
  status: 'active' | 'disabled';
  /** 所属租户（跟随字典类型归属） */
  tenantId: string;
  /** 可选语义色（用于标签展示） */
  color?: string;
  createdAt: string;
}

/** 字典类型查询参数 */
export interface DictTypeQuery {
  keyword?: string;
  status?: 'active' | 'disabled' | '';
  tenantId?: string;
  page: number;
  pageSize: number;
}

/** 字典数据查询参数 */
export interface DictDataQuery {
  typeId?: string;
  tenantId?: string;
}
