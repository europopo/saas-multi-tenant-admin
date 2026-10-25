/**
 * 认证领域 Mock 接口
 */
import { defineMock } from '@alova/mock';
import type { LoginParams, LoginResult, UserInfo } from '@saas/shared';
import { RESPONSE, BUSINESS_CODE } from '@saas/shared';
import { db, resolveUserAuth } from '../db';

/** 用户名 → 用户 id（登录时按 username 定位账号，密码校验走 db.credentials） */
const ACCOUNT_USER_MAP: Record<string, string> = {
  admin: 'user-admin',
  tenant_admin: 'user-tenant-admin',
  member: 'user-member',
};

export default defineMock({
  /** 登录 */
  '[POST]/auth/login': ({ data }) => {
    const { username, password } = data as LoginParams;
    // 优先按 db 内登记的用户名→用户id 映射，回退到内置演示账号映射
    const userId =
      db.users.find((u) => u.username === username)?.id ?? ACCOUNT_USER_MAP[username];
    if (!userId) {
      return RESPONSE.error('用户名或密码错误', BUSINESS_CODE.UNAUTHORIZED);
    }
    const expected = db.credentials[username];
    if (!expected || expected !== password) {
      return RESPONSE.error('用户名或密码错误', BUSINESS_CODE.UNAUTHORIZED);
    }
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return RESPONSE.error('用户不存在', BUSINESS_CODE.NOT_FOUND);
    }
    if (user.status === 'disabled') {
      return RESPONSE.error('账号已被停用', BUSINESS_CODE.FORBIDDEN);
    }
    const token = `mock-token-${user.id}-${Date.now()}`;
    db.tokens.set(token, user.id);
    const result: LoginResult = { token, user: resolveUserAuth(user) };
    return RESPONSE.success(result, '登录成功');
  },

  /** 退出登录 */
  '[POST]/auth/logout': ({ data }) => {
    const { token } = data as { token?: string };
    if (token) db.tokens.delete(token);
    return RESPONSE.success(null, '已退出登录');
  },

  /** 获取当前用户信息 */
  '/auth/me': ({ data }) => {
    const { token } = data as { token?: string };
    const userId = token ? db.tokens.get(token) : undefined;
    const user = userId ? db.users.find((u) => u.id === userId) : undefined;
    if (!user) {
      return RESPONSE.error('未登录或登录已失效', BUSINESS_CODE.UNAUTHORIZED);
    }
    return RESPONSE.success<UserInfo>(resolveUserAuth(user));
  },
});
