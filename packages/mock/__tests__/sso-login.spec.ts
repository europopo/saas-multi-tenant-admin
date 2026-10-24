/**
 * SSO 单点登录端到端测试
 * 真实执行 Alova 实例 + mock 适配器，验证 SSO 完整流程。
 */
import { describe, it, expect } from 'vitest';
import { createApiClient } from '@saas/api-client';
import { createMockAdapter } from '../src/adapter';
import type { SsoProvider, SsoLoginResult } from '@saas/shared';

function createMockClient() {
  return createApiClient({
    baseURL: '/api',
    requestAdapter: createMockAdapter(true),
    getToken: () => null,
  });
}

describe('SSO login (mock)', () => {
  const alova = createMockClient();

  it('获取启用的 SSO 提供商列表', async () => {
    const providers = await alova.Get<SsoProvider[]>('/sso/providers').send();
    expect(providers.length).toBeGreaterThan(0);
    // 只返回启用的提供商（oidc/wecom/feishu），禁用（dingtalk/ldap）不返回
    expect(providers.every((p) => p.status === 'active')).toBe(true);
    expect(providers.some((p) => p.code === 'wecom')).toBe(true);
    expect(providers.some((p) => p.code === 'dingtalk')).toBe(false);
  });

  it('发起 SSO 授权返回 state 与授权地址', async () => {
    const result = await alova
      .Post<{ provider: string; state: string; authorizeUrl: string }>('/sso/authorize', {
        provider: 'wecom',
        redirect: '/dashboard',
      })
      .send();

    expect(result.provider).toBe('wecom');
    expect(result.state).toContain('sso-state');
    expect(result.authorizeUrl).toContain('provider=wecom');
  });

  it('SSO 回调换取 token 与用户信息（首次登录自动创建账号）', async () => {
    const result = await alova
      .Post<SsoLoginResult>('/sso/callback', {
        provider: 'wecom',
        code: 'mock-auth-code-12345',
        state: 'sso-state-abc',
      })
      .send();

    expect(result.token).toContain('mock-token-');
    expect(result.provider).toBe('wecom');
    expect(result.user.email).toBe('zhangsan@demo-tech.com');
    // 企业微信用户「张三」首次登录，自动创建账号
    expect(result.isNewUser).toBe(true);
  });

  it('无效授权码回调失败', async () => {
    await expect(
      alova.Post('/sso/callback', { provider: 'wecom', code: 'invalid-code' }).send(),
    ).rejects.toThrow('授权码无效或已过期');
  });

  it('停用的提供商无法发起授权', async () => {
    await expect(
      alova.Post('/sso/authorize', { provider: 'dingtalk' }).send(),
    ).rejects.toThrow('SSO 提供商不存在或已停用');
  });
});
