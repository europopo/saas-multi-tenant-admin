/**
 * 数据字典 + 站内信 测试
 * 验证：字典纯租户级隔离、字典数据按编码查询、站内信目标范围可见性与已读状态。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createApiClient } from '@saas/api-client';
import { createMockAdapter } from '../src/adapter';
import { resetDatabase, db } from '../src/db';
import type { DictType, DictData, DictItem, PageResult, NoticeMessage, NoticeMessageView } from '@saas/shared';

function createMockClient() {
  return createApiClient({
    baseURL: '/api',
    requestAdapter: createMockAdapter(true),
    getToken: () => null,
  });
}

describe('数据字典（纯租户级）', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('字典类型按租户隔离：租户管理员仅看到本租户字典', async () => {
    const alova = createMockClient();
    // tenant_admin 属于 tenant-demo
    const res = await alova
      .Get<PageResult<DictType>>('/dict/type/list', {
        params: { userId: 'user-tenant-admin', page: 1, pageSize: 20 },
      })
      .send();
    expect(res.total).toBeGreaterThan(0);
    // 所有返回的字典类型都属于 tenant-demo
    expect(res.list.every((t) => t.tenantId === 'tenant-demo')).toBe(true);
    // 内置种子包含任务优先级
    expect(res.list.some((t) => t.type === 'task_priority')).toBe(true);
  });

  it('平台管理员可跨租户查看全部字典', async () => {
    const alova = createMockClient();
    const res = await alova
      .Get<PageResult<DictType>>('/dict/type/list', {
        params: { userId: 'user-admin', page: 1, pageSize: 50 },
      })
      .send();
    // 平台管理员不限租户，返回全部（至少包含种子数据）
    expect(res.total).toBeGreaterThanOrEqual(3);
  });

  it('创建字典类型必须归属租户，且同租户编码唯一', async () => {
    const alova = createMockClient();
    // 缺少 tenantId 应报错
    await expect(
      alova.Post<DictType>('/dict/type/create', { name: '测试', type: 'test_type' }).send(),
    ).rejects.toThrow('字典必须归属某个租户');

    // 正常创建
    const created = await alova
      .Post<DictType>('/dict/type/create', { name: '测试字典', type: 'test_type', tenantId: 'tenant-demo' })
      .send();
    expect(created.id).toBeTruthy();
    expect(created.tenantId).toBe('tenant-demo');

    // 同租户重复编码报错
    await expect(
      alova.Post<DictType>('/dict/type/create', { name: '重复', type: 'test_type', tenantId: 'tenant-demo' }).send(),
    ).rejects.toThrow('同租户下字典编码已存在');
  });

  it('按编码查询字典数据返回 DictItem[]', async () => {
    const alova = createMockClient();
    const items = await alova
      .Get<DictItem[]>('/dict/data/by-type', { params: { type: 'task_priority', tenantId: 'tenant-demo' } })
      .send();
    expect(items.length).toBeGreaterThan(0);
    // 每项都有 label/value
    expect(items.every((i) => 'label' in i && 'value' in i)).toBe(true);
    // value 为英文编码
    expect(items.some((i) => i.value === 'urgent' || i.value === 'high')).toBe(true);
  });

  it('删除字典类型级联删除字典数据', async () => {
    const alova = createMockClient();
    const typeId = db.dictTypes.find((t) => t.type === 'task_priority')!.id;
    const before = db.dictData.filter((d) => d.typeId === typeId).length;
    expect(before).toBeGreaterThan(0);

    await alova.Delete<null>(`/dict/type/${typeId}`).send();

    expect(db.dictTypes.find((t) => t.id === typeId)).toBeUndefined();
    expect(db.dictData.filter((d) => d.typeId === typeId).length).toBe(0);
  });
});

describe('站内信（通知中心）', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('全量消息对所有用户可见', async () => {
    const alova = createMockClient();
    const res = await alova
      .Get<PageResult<NoticeMessageView>>('/message/list', {
        params: { userId: 'user-member', page: 1, pageSize: 20 },
      })
      .send();
    // 全量消息（欢迎通知、租户到期提醒）应对 member 可见
    expect(res.list.some((m) => m.id === 'notice-welcome')).toBe(true);
  });

  it('租户定向消息仅目标租户可见', async () => {
    const alova = createMockClient();
    // tenant-demo 用户可见「新功能上线」定向消息
    const demoRes = await alova
      .Get<PageResult<NoticeMessageView>>('/message/list', {
        params: { userId: 'user-tenant-admin', page: 1, pageSize: 20 },
      })
      .send();
    expect(demoRes.list.some((m) => m.id === 'notice-feature')).toBe(true);
  });

  it('未读数统计与已读状态隔离', async () => {
    const alova = createMockClient();
    // admin 已读欢迎通知，未读「租户到期」+「新功能上线」（新功能是 tenant 定向，admin 属 tenant-demo 可见）
    const unread = await alova
      .Get<number>('/message/unread-count', { params: { userId: 'user-admin' }, cacheFor: null })
      .send();
    expect(unread).toBeGreaterThanOrEqual(1);

    // 标记一条已读后未读数减少
    await alova.Post<null>('/message/read', { messageId: 'notice-tenant-expire', userId: 'user-admin' }).send();
    const afterRead = await alova
      .Get<number>('/message/unread-count', { params: { userId: 'user-admin' }, cacheFor: null })
      .send();
    expect(afterRead).toBe(unread - 1);
  });

  it('平台管理员可发送全量通知', async () => {
    const alova = createMockClient();
    const msg = await alova
      .Post<NoticeMessage>('/message/send', {
        title: '系统维护通知',
        content: '本周六凌晨维护',
        type: 'system',
        targetType: 'all',
        sender: '平台管理员',
      })
      .send();
    expect(msg.id).toBeTruthy();
    expect(msg.targetType).toBe('all');

    // 任意用户都应能看到这条新通知
    const memberRes = await alova
      .Get<PageResult<NoticeMessageView>>('/message/list', {
        params: { userId: 'user-member', page: 1, pageSize: 50 },
      })
      .send();
    expect(memberRes.list.some((m) => m.id === msg.id)).toBe(true);
  });

  it('发送租户定向通知需要指定目标租户', async () => {
    const alova = createMockClient();
    await expect(
      alova
        .Post<NoticeMessage>('/message/send', {
          title: 'x',
          content: 'y',
          type: 'system',
          targetType: 'tenant',
          targetIds: [],
        })
        .send(),
    ).rejects.toThrow('请选择接收对象');
  });
});
