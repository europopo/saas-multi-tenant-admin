/**
 * 站内信（通知中心）领域 Mock 接口
 *
 * 消息本体 + 用户已读状态分离：消息广播给目标范围，已读按用户各记一份。
 * - 平台管理员可发送「全体 / 指定租户」定向通知；
 * - 用户按租户隔离查看自己的通知。
 */
import { defineMock } from '@alova/mock';
import type {
  NoticeMessage,
  NoticeMessageView,
  MessageQuery,
  MessageSendParams,
  PageResult,
} from '@saas/shared';
import { RESPONSE, BUSINESS_CODE, generateId, paginate } from '@saas/shared';
import { db } from '../db';

/** 判断某消息是否对目标用户可见 */
function isMessageVisible(
  msg: NoticeMessage,
  user: { id: string; tenantId: string | null },
): boolean {
  if (msg.targetType === 'all') return true;
  if (msg.targetType === 'tenant') {
    // 指定租户：匹配用户所属租户；平台用户（tenantId 为 null）不命中租户定向消息
    return user.tenantId != null && (msg.targetIds ?? []).includes(user.tenantId);
  }
  if (msg.targetType === 'user') {
    return (msg.targetIds ?? []).includes(user.id);
  }
  return false;
}

/** 为某个用户聚合「消息 + 已读状态」 */
function toView(msg: NoticeMessage, userId: string): NoticeMessageView {
  const read = db.messageReadStates.find((r) => r.messageId === msg.id && r.userId === userId);
  return { ...msg, isRead: read?.isRead ?? false, readAt: read?.readAt };
}

export default defineMock({
  /** 当前用户可见的消息列表（租户隔离 + 已读状态/类型筛选 + 分页） */
  '/message/list': ({ query }) => {
    const q = (query ?? {}) as MessageQuery & Record<string, string>;
    const user = db.users.find((u) => u.id === q.userId);
    if (!user) return RESPONSE.error('用户不存在', BUSINESS_CODE.NOT_FOUND);

    let list = db.notices
      .filter((m) => isMessageVisible(m, user))
      .map((m) => toView(m, user.id));

    if (q.type) list = list.filter((m) => m.type === q.type);
    if (q.readStatus === 'unread') list = list.filter((m) => !m.isRead);
    if (q.readStatus === 'read') list = list.filter((m) => m.isRead);

    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const page = Number(q.page) || 1;
    const pageSize = Number(q.pageSize) || 10;
    const result = paginate(list, page, pageSize);
    return RESPONSE.success<PageResult<NoticeMessageView>>({
      list: result.list,
      total: result.total,
      page,
      pageSize,
    });
  },

  /** 未读数（供顶栏角标） */
  '/message/unread-count': ({ query }) => {
    const q = (query ?? {}) as { userId?: string } & Record<string, string>;
    const user = db.users.find((u) => u.id === q.userId);
    if (!user) return RESPONSE.success<number>(0);
    const unread = db.notices.filter((m) => {
      if (!isMessageVisible(m, user)) return false;
      return !db.messageReadStates.some((r) => r.messageId === m.id && r.userId === user.id && r.isRead);
    }).length;
    return RESPONSE.success<number>(unread);
  },

  /** 标记单条已读 */
  '[POST]/message/read': ({ data }) => {
    const { messageId, userId } = data as { messageId: string; userId: string };
    let state = db.messageReadStates.find((r) => r.messageId === messageId && r.userId === userId);
    if (state) {
      state.isRead = true;
      state.readAt = new Date().toISOString();
    } else {
      state = {
        id: generateId('read'),
        messageId,
        userId,
        isRead: true,
        readAt: new Date().toISOString(),
      };
      db.messageReadStates.push(state);
    }
    return RESPONSE.success<null>(null, '已标记为已读');
  },

  /** 全部标记已读 */
  '[POST]/message/read-all': ({ data }) => {
    const { userId } = data as { userId: string };
    const user = db.users.find((u) => u.id === userId);
    if (!user) return RESPONSE.error('用户不存在', BUSINESS_CODE.NOT_FOUND);
    const visibleIds = db.notices.filter((m) => isMessageVisible(m, user)).map((m) => m.id);
    const now = new Date().toISOString();
    for (const mid of visibleIds) {
      let state = db.messageReadStates.find((r) => r.messageId === mid && r.userId === userId);
      if (state) {
        state.isRead = true;
        state.readAt = now;
      } else {
        db.messageReadStates.push({ id: generateId('read'), messageId: mid, userId, isRead: true, readAt: now });
      }
    }
    return RESPONSE.success<null>(null, '已全部标记为已读');
  },

  /** 发送通知（平台管理员，支持全体 / 指定租户 / 指定用户） */
  '[POST]/message/send': ({ data }) => {
    const body = data as MessageSendParams;
    if (!body.title || !body.content) {
      return RESPONSE.error('标题和内容不能为空', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (body.targetType !== 'all' && (!body.targetIds || body.targetIds.length === 0)) {
      return RESPONSE.error('请选择接收对象', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const msg: NoticeMessage = {
      id: generateId('notice'),
      title: body.title,
      content: body.content,
      type: body.type ?? 'system',
      targetType: body.targetType,
      targetIds: body.targetType === 'all' ? undefined : body.targetIds,
      sender: body.sender ?? '系统',
      tenantId: body.tenantId ?? null,
      createdAt: new Date().toISOString(),
    };
    db.notices.push(msg);
    return RESPONSE.success<NoticeMessage>(msg, '发送成功');
  },

  /** 删除消息（当前用户删除自己的接收记录，即标记为不可见不落地；此处直接删除已读状态并保留消息给他人） */
  '[DELETE]/message/{id}': ({ params, query }) => {
    const id = params.id as string;
    const userId = (query as { userId?: string }).userId;
    const msg = db.notices.find((m) => m.id === id);
    if (!msg) return RESPONSE.error('消息不存在', BUSINESS_CODE.NOT_FOUND);
    if (userId) {
      // 用户删除自己的这条消息（移除已读状态即可，消息本体保留给其他接收者）
      db.messageReadStates = db.messageReadStates.filter(
        (r) => !(r.messageId === id && r.userId === userId),
      );
      return RESPONSE.success<null>(null, '已删除');
    }
    db.notices = db.notices.filter((m) => m.id !== id);
    db.messageReadStates = db.messageReadStates.filter((r) => r.messageId !== id);
    return RESPONSE.success<null>(null, '已删除');
  },
});
