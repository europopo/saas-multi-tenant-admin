/**
 * 认证登录端到端测试
 * 真实执行 Alova 实例 + mock 适配器，验证登录链路（含 matchMode 修复）。
 */
import { describe, it, expect } from 'vitest';
import { createApiClient } from '@saas/api-client';
import { createMockAdapter } from '../src/adapter';
import type { LoginResult } from '@saas/shared';

/** 创建带 mock 适配器的 Alova 实例 */
function createMockClient() {
  return createApiClient({
    baseURL: '/api',
    requestAdapter: createMockAdapter(true),
    getToken: () => null,
  });
}

describe('auth login (mock)', () => {
  const alova = createMockClient();

  it('正确账号密码登录成功，返回 token 和 user', async () => {
    const result = await alova.Post<LoginResult>('/auth/login', {
      username: 'admin',
      password: 'admin123',
    }).send();

    expect(result.token).toBeTruthy();
    expect(result.token).toContain('mock-token-');
    expect(result.user.username).toBe('admin');
    expect(result.user.isPlatformAdmin).toBe(true);
    expect(result.user.permissions).toContain('*');
  });

  it('错误密码登录失败', async () => {
    await expect(
      alova.Post('/auth/login', { username: 'admin', password: 'wrong' }).send(),
    ).rejects.toThrow('用户名或密码错误');
  });

  it('不存在的用户登录失败', async () => {
    await expect(
      alova.Post('/auth/login', { username: 'nobody', password: 'whatever1' }).send(),
    ).rejects.toThrow('用户名或密码错误');
  });

  it('租户管理员登录返回租户级权限', async () => {
    const result = await alova.Post<LoginResult>('/auth/login', {
      username: 'tenant_admin',
      password: 'tenant123',
    }).send();

    expect(result.user.isPlatformAdmin).toBe(false);
    expect(result.user.permissions).toContain('task:read');
  });
});
