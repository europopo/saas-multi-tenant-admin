/**
 * 站内信（通知中心）相关类型
 *
 * 采用「消息本体 + 用户已读状态」两张表分离的模型：
 * - 消息本体只读、广播给目标范围（全体 / 指定租户 / 指定用户）；
 * - 已读状态按「用户 × 消息」各一份，避免一条消息多接收者时已读状态互相干扰。
 */

/** 消息类型 */
export type MessageType = 'system' | 'business' | 'warning';

/** 接收范围 */
export type MessageTargetType = 'all' | 'tenant' | 'user';

/** 消息本体（广播给目标范围，只读） */
export interface NoticeMessage {
  id: string;
  title: string;
  content: string;
  type: MessageType;
  /** 接收范围 */
  targetType: MessageTargetType;
  /** 接收对象 id（targetType 非 all 时） */
  targetIds?: string[];
  /** 发送者（系统自动通知为 'system'，平台管理员发送为管理员昵称） */
  sender: string;
  /** 消息归属租户（平台级通知为 null） */
  tenantId: string | null;
  createdAt: string;
}

/** 用户已读状态（每用户 × 每消息 一条） */
export interface MessageReadState {
  id: string;
  messageId: string;
  userId: string;
  isRead: boolean;
  readAt?: string;
}

/** 站内信列表项：消息本体 + 当前用户已读状态合并 */
export interface NoticeMessageView extends NoticeMessage {
  isRead: boolean;
  readAt?: string;
}

/** 站内信查询参数 */
export interface MessageQuery {
  userId: string;
  /** 已读状态筛选：all / unread / read */
  readStatus?: 'all' | 'unread' | 'read';
  type?: MessageType | '';
  page: number;
  pageSize: number;
}

/** 发送通知参数 */
export interface MessageSendParams {
  title: string;
  content: string;
  type: MessageType;
  targetType: MessageTargetType;
  targetIds?: string[];
  sender?: string;
  tenantId?: string | null;
}
