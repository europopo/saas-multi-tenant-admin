/**
 * SSO 单点登录领域 Mock 接口
 *
 * 全部为前端模拟数据，模拟真实的 OIDC / 企业身份认证流程：
 * 1. 获取可用 SSO 提供商
 * 2. 发起授权（返回授权地址 + state）
 * 3. 回调校验授权码，换取 token 与用户信息（首次登录自动创建账号）
 */
import { defineMock } from '@alova/mock';
import type {
  SsoProvider,
  SsoLoginParams,
  SsoCallbackParams,
  SsoLoginResult,
  UserInfo,
} from '@saas/shared';
import { RESPONSE, BUSINESS_CODE, generateId } from '@saas/shared';
import { db } from '../db';

/** 模拟 IdP 中的企业用户目录（邮箱/工号 → 用户信息） */
const IDP_USERS: Record<string, { username: string; nickname: string; email: string }> = {
  wecom: { username: 'zhangsan', nickname: '张三', email: 'zhangsan@demo-tech.com' },
  feishu: { username: 'lisi', nickname: '李四', email: 'lisi@alpha-net.com' },
  oidc: { username: 'wangwu', nickname: '王五', email: 'wangwu@demo-tech.com' },
  dingtalk: { username: 'zhaoliu', nickname: '赵六', email: 'zhaoliu@gamma-mfg.com' },
  ldap: { username: 'sunqi', nickname: '孙七', email: 'sunqi@delta-edu.com' },
};

export default defineMock({
  /** 获取启用的 SSO 提供商列表 */
  '/sso/providers': () => {
    const list = db.ssoProviders.filter((p) => p.status === 'active');
    return RESPONSE.success<SsoProvider[]>(list);
  },

  /** 发起 SSO 授权：生成 state 与授权地址（模拟） */
  '[POST]/sso/authorize': ({ data }) => {
    const { provider: providerCode, redirect } = data as SsoLoginParams;
    const provider = db.ssoProviders.find(
      (p) => p.code === providerCode && p.status === 'active',
    );
    if (!provider) {
      return RESPONSE.error('SSO 提供商不存在或已停用', BUSINESS_CODE.NOT_FOUND);
    }
    const state = generateId('sso-state');
    // 模拟：将 state 与提供商关联，供回调校验
    return RESPONSE.success({
      provider: provider.code,
      state,
      // 模拟授权地址（真实场景跳转到 IdP 登录页）
      authorizeUrl: `${provider.authorizeUrl}?provider=${provider.code}&state=${state}&redirect_uri=${encodeURIComponent(provider.redirectUri)}`,
      redirect,
    });
  },

  /** SSO 回调：校验授权码，换取 token 与用户信息 */
  '[POST]/sso/callback': ({ data }) => {
    const { provider: providerCode, code, state } = data as SsoCallbackParams;
    const provider = db.ssoProviders.find((p) => p.code === providerCode);
    if (!provider || provider.status !== 'active') {
      return RESPONSE.error('SSO 提供商不存在或已停用', BUSINESS_CODE.NOT_FOUND);
    }

    // 模拟校验 state（防 CSRF）
    if (state && !state.startsWith('sso-state')) {
      return RESPONSE.error('state 校验失败，请求可能被篡改', BUSINESS_CODE.UNAUTHORIZED);
    }

    // 模拟校验授权码（真实场景向 IdP 交换 token 并校验）
    if (!code || !code.startsWith('mock-auth-code-')) {
      return RESPONSE.error('授权码无效或已过期', BUSINESS_CODE.UNAUTHORIZED);
    }

    // 从模拟 IdP 目录获取用户信息
    const idpUser = IDP_USERS[providerCode];
    if (!idpUser) {
      return RESPONSE.error('该 SSO 提供商暂无可用账号', BUSINESS_CODE.NOT_FOUND);
    }

    // 查找是否已存在对应用户；不存在则自动创建（首次 SSO 登录）
    let user = db.users.find(
      (u) => u.email.toLowerCase() === idpUser.email.toLowerCase(),
    );
    let isNewUser = false;

    if (!user) {
      const memberRole = db.roles.find((r) => r.code === 'tenant_user');
      user = {
        id: generateId('user'),
        username: idpUser.username,
        nickname: idpUser.nickname,
        avatar: '',
        email: idpUser.email,
        status: 'active',
        roleIds: memberRole ? [memberRole.id] : [],
        roles: memberRole ? [memberRole.code] : [],
        permissions: memberRole?.permissionCodes ?? ['task:read'],
        tenantId: 'tenant-demo',
        isPlatformAdmin: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      db.users.push(user);
      isNewUser = true;
    }

    const token = `mock-token-${user.id}-${Date.now()}`;
    db.tokens.set(token, user.id);

    const result: SsoLoginResult = {
      token,
      user,
      isNewUser,
      provider: provider.code,
    };
    return RESPONSE.success<SsoLoginResult>(result, 'SSO 登录成功');
  },

  /** 查询用户已绑定的 SSO 提供商（演示：返回当前用户可用的提供商） */
  '/sso/bindings': ({ query }) => {
    const { userId } = query as { userId?: string };
    const user = db.users.find((u) => u.id === userId);
    if (!user) return RESPONSE.error('用户不存在', BUSINESS_CODE.NOT_FOUND);
    // 演示：返回与用户邮箱域名匹配的提供商
    const domain = user.email.split('@')[1] ?? '';
    const bound = db.ssoProviders.filter((p) => p.status === 'active');
    return RESPONSE.success({
      userId: user.id,
      email: user.email,
      domain,
      providers: bound.map((p) => ({ code: p.code, name: p.name, bound: true })),
    });
  },
});

/** 导出模拟 IdP 用户目录，供测试与文档参考 */
export { IDP_USERS };

/** 类型辅助导出（供页面使用） */
export type SsoAuthorizeResult = {
  provider: string;
  state: string;
  authorizeUrl: string;
  redirect?: string;
};

/** 类型辅助导出 */
export type SsoBindingsResult = {
  userId: string;
  email: string;
  domain: string;
  providers: Array<{ code: string; name: string; bound: boolean }>;
};

export type { UserInfo };
