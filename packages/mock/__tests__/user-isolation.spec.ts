/**
 * 数据隔离：平台级用户不挂租户，租户管理员查询用户时不应看到平台管理员
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createApiClient } from '@saas/api-client';
import { createMockAdapter } from '../src/adapter';
import { resetDatabase, db } from '../src/db';
import type { UserInfo, PageResult } from '@saas/shared';

function createMockClient() {
  return createApiClient({
    baseURL: '/api',
    requestAdapter: createMockAdapter(true),
    getToken: () => null,
  });
}

describe('用户数据隔离（平台级 vs 租户级）', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('平台管理员 tenantId 为 null，不属于任何租户', () => {
    const admin = db.users.find((u) => u.id === 'user-admin');
    expect(admin).toBeTruthy();
    expect(admin!.tenantId).toBeNull();
    expect(admin!.isPlatformAdmin).toBe(true);
  });

  it('租户管理员查用户列表时，不应看到平台管理员', async () => {
    const alova = createMockClient();
    const tenantAdmin = db.users.find((u) => u.id === 'user-tenant-admin');
    expect(tenantAdmin!.tenantId).toBe('tenant-demo');

    const result = await alova
      .Get<PageResult<UserInfo>>('/user/list', {
        params: { userId: 'user-tenant-admin', page: 1, pageSize: 100 },
      })
      .send();

    // 返回的用户都应属于 tenant-demo，且不含平台管理员（tenantId 为 null）
    const usernames = result.list.map((u) => u.username);
    expect(usernames).toContain('tenant_admin');
    expect(usernames).not.toContain('admin');
    expect(result.list.every((u) => u.tenantId === 'tenant-demo')).toBe(true);
  });

  it('平台管理员查用户列表时，可见全部用户（含平台管理员与各租户用户）', async () => {
    const alova = createMockClient();
    const result = await alova
      .Get<PageResult<UserInfo>>('/user/list', {
        params: { userId: 'user-admin', page: 1, pageSize: 100 },
      })
      .send();

    const usernames = result.list.map((u) => u.username);
    expect(usernames).toContain('admin');
    expect(usernames).toContain('tenant_admin');
  });
});
